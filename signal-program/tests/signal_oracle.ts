import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { SignalOracle } from "../target/types/signal_oracle";
import { startAnchor, BankrunProvider } from "anchor-bankrun";
import { Clock, ProgramTestContext } from "solana-bankrun";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMint2Instruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  unpackAccount,
} from "@solana/spl-token";
import { createHash } from "crypto";
import { assert, AssertionError } from "chai";

const { Keypair, PublicKey, SystemProgram, Transaction } = anchor.web3;
type Keypair = anchor.web3.Keypair;
type PublicKey = anchor.web3.PublicKey;

/**
 * Signal oracle, end to end on an in-process bank.
 *
 * Prices and rewards are 6-decimal micro-units, like USDC: 800_000 = $0.80.
 * bankrun lets the test set the clock, which is the only way to reach the
 * 48-hour pending timeout.
 */
describe("signal_oracle", () => {
  const USDC = 1_000_000;
  const HOUR = 3_600n;
  const PARAMS = {
    baseReward: new BN(200_000), // $0.20 at reputation 50
    minBoundsSamples: 3,
    boundsToleranceBps: 4_000, // ±40%
    peerToleranceBps: 2_500, // ±25%
    peerQuorum: 2,
    peerWindowSecs: new BN(72 * 3600),
    pendingTimeoutSecs: new BN(48 * 3600),
    bootstrapMinReputation: 40,
    banBelowReputation: 15,
  };

  let context: ProgramTestContext;
  let program: Program<SignalOracle>;
  let payer: Keypair;
  const attester = Keypair.generate();
  let mint: PublicKey;
  let config: PublicKey;
  let vault: PublicKey;

  const feedId = (key: string) => Array.from(createHash("sha256").update(key).digest());
  const photo = (name: string) => Array.from(createHash("sha256").update(`photo:${name}`).digest());
  const pda = (...seeds: (Buffer | Uint8Array)[]) =>
    PublicKey.findProgramAddressSync(seeds, program.programId)[0];
  const feedPda = (key: string) => pda(Buffer.from("feed"), Buffer.from(feedId(key)));
  const reportPda = (feed: PublicKey, hash: number[]) => pda(Buffer.from("report"), feed.toBuffer(), Buffer.from(hash));
  const reporterPda = (wallet: PublicKey) => pda(Buffer.from("reporter"), wallet.toBuffer());

  const send = async (ixs: anchor.web3.TransactionInstruction[], signers: Keypair[] = []) => {
    const tx = new Transaction();
    const [blockhash] = await context.banksClient.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = payer.publicKey;
    tx.add(...ixs);
    tx.sign(payer, ...signers);
    return context.banksClient.processTransaction(tx);
  };

  const errorCodeOf = (err: any): string => {
    if (err instanceof AssertionError) throw err;
    const text = `${err?.message ?? ""} ${JSON.stringify(err?.logs ?? [])}`;
    const byName = text.match(/Error Code: (\w+)/);
    if (byName) return byName[1];
    const byNumber = text.match(/custom program error: (0x[0-9a-fA-F]+)/);
    if (byNumber) {
      const code = parseInt(byNumber[1], 16);
      const known = (program.idl.errors ?? []).find((e: any) => e.code === code);
      if (known) return known.name;
      if (code === 0) return "AccountAlreadyInUse"; // system program: create on an existing address
      if (code === 2003) return "ConstraintRaw";
      if (code === 2001) return "ConstraintHasOne";
      return `custom error ${code}`;
    }
    return text.slice(0, 300);
  };

  const expectError = async (promise: Promise<unknown>, expected: string, why: string) => {
    try {
      await promise;
    } catch (err) {
      const actual = errorCodeOf(err);
      assert.strictEqual(actual.toLowerCase(), expected.toLowerCase(), `${why} (expected ${expected}, got ${actual})`);
      return;
    }
    assert.fail(`${why}: expected ${expected}, but the transaction succeeded`);
  };

  const tokenBalance = async (address: PublicKey): Promise<bigint> => {
    const account = await context.banksClient.getAccount(address);
    if (!account) return 0n;
    return unpackAccount(address, { ...account, data: Buffer.from(account.data), owner: new PublicKey(account.owner) } as any)
      .amount;
  };

  const advanceSeconds = async (secs: bigint) => {
    const before = await context.banksClient.getClock();
    context.warpToSlot(before.slot + 1_000n);
    const clock = await context.banksClient.getClock();
    context.setClock(
      new Clock(clock.slot, clock.epochStartTimestamp, clock.epoch, clock.leaderScheduleEpoch, before.unixTimestamp + secs)
    );
  };

  /** A fresh blockhash, so an identical retry is a new transaction rather than a replay. */
  const nextSlot = async () => {
    const clock = await context.banksClient.getClock();
    context.warpToSlot(clock.slot + 1n);
  };

  const newReporter = async (): Promise<Keypair> => {
    const kp = Keypair.generate();
    // Reporters never pay: the attester covers rent. They only need to exist and sign.
    return kp;
  };

  const submit = (wallet: Keypair, feedKey: string, hash: number[], price: number, signer: Keypair = attester) => {
    const feed = feedPda(feedKey);
    return program.methods
      .submitReport(feedId(feedKey), hash, new BN(price))
      .accountsPartial({
        attester: signer.publicKey,
        reporterWallet: wallet.publicKey,
        config,
        reporter: reporterPda(wallet.publicKey),
        feed,
        report: reportPda(feed, hash),
        vault,
        systemProgram: SystemProgram.programId,
      })
      .instruction()
      .then((ix) => send([ix], [signer, wallet]));
  };

  const peerCheck = async (r1: PublicKey, r2: PublicKey) => {
    const [a, b] = Buffer.compare(r1.toBuffer(), r2.toBuffer()) < 0 ? [r1, r2] : [r2, r1];
    const ix = await program.methods
      .peerCheck()
      .accountsPartial({
        cranker: payer.publicKey,
        config,
        reportA: a,
        reportB: b,
        peerLink: pda(Buffer.from("peer"), a.toBuffer(), b.toBuffer()),
        systemProgram: SystemProgram.programId,
      })
      .instruction();
    return send([ix]);
  };

  const settle = async (report: PublicKey) => {
    const r = await program.account.report.fetch(report);
    const ix = await program.methods
      .settle()
      .accountsPartial({
        cranker: payer.publicKey,
        usdcMint: mint,
        config,
        report,
        reporter: reporterPda(r.reporter),
        feed: r.feed,
        reporterWallet: r.reporter,
        reporterAta: getAssociatedTokenAddressSync(mint, r.reporter),
        vault,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
    return send([ix]);
  };

  const fund = async (amount: number) => {
    const ix = await program.methods
      .fundPool(new BN(amount))
      .accountsPartial({
        funder: payer.publicKey,
        usdcMint: mint,
        config,
        funderAta: getAssociatedTokenAddressSync(mint, payer.publicKey),
        vault,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();
    return send([ix]);
  };

  const reputation = async (wallet: Keypair) => (await program.account.reporter.fetch(reporterPda(wallet.publicKey))).reputation;
  const statusOf = async (report: PublicKey) => Object.keys((await program.account.report.fetch(report)).status)[0];

  before(async () => {
    context = await startAnchor("", [], []);
    const provider = new BankrunProvider(context);
    anchor.setProvider(provider);
    program = new anchor.Program<SignalOracle>(require("../target/idl/signal_oracle.json"), provider);
    payer = context.payer;

    // A 6-decimal test USDC mint, with 1,000 USDC minted to the payer.
    const mintKp = Keypair.generate();
    mint = mintKp.publicKey;
    const rent = await context.banksClient.getRent();
    const payerAta = getAssociatedTokenAddressSync(mint, payer.publicKey);
    await send(
      [
        SystemProgram.createAccount({
          fromPubkey: payer.publicKey,
          newAccountPubkey: mint,
          lamports: Number(rent.minimumBalance(BigInt(MINT_SIZE))),
          space: MINT_SIZE,
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMint2Instruction(mint, 6, payer.publicKey, null),
        createAssociatedTokenAccountInstruction(payer.publicKey, payerAta, payer.publicKey, mint),
        createMintToInstruction(mint, payerAta, payer.publicKey, 1_000 * USDC),
      ],
      [mintKp]
    );

    // The attester pays rent for reports, so it needs SOL.
    await send([SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: attester.publicKey, lamports: 5_000_000_000 })]);

    config = pda(Buffer.from("config"));
    vault = getAssociatedTokenAddressSync(mint, config, true);
    const ix = await program.methods
      .initialize({ attester: attester.publicKey, ...PARAMS })
      .accountsPartial({
        admin: payer.publicKey,
        usdcMint: mint,
        config,
        vault,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
    await send([ix]);
    await fund(10 * USDC);
  });

  // ── Happy path ─────────────────────────────────────────────────────────────

  it("accepts two agreeing peers, pays both from the vault, and starts the feed", async () => {
    const FEED = "FUEL:ng-lagos:petrol_litre";
    const a = await newReporter();
    const b = await newReporter();
    await submit(a, FEED, photo("a1"), 800_000);
    await submit(b, FEED, photo("b1"), 820_000);
    const ra = reportPda(feedPda(FEED), photo("a1"));
    const rb = reportPda(feedPda(FEED), photo("b1"));

    let cfg = await program.account.config.fetch(config);
    assert.strictEqual(cfg.totalLocked.toNumber(), 400_000, "both rewards locked while pending");

    await expectError(settle(ra), "StillPending", "no evidence yet, so it cannot settle");
    await nextSlot();

    await peerCheck(ra, rb);
    await settle(ra);
    await settle(rb);

    assert.strictEqual(await statusOf(ra), "accepted");
    assert.strictEqual(await statusOf(rb), "accepted");
    assert.strictEqual(await tokenBalance(getAssociatedTokenAddressSync(mint, a.publicKey)), 200_000n);
    assert.strictEqual(await tokenBalance(getAssociatedTokenAddressSync(mint, b.publicKey)), 200_000n);
    assert.strictEqual(await reputation(a), 53);

    cfg = await program.account.config.fetch(config);
    assert.strictEqual(cfg.totalLocked.toNumber(), 0, "locks released");
    const feed = await program.account.feed.fetch(feedPda(FEED));
    assert.strictEqual(feed.len, 2);
    assert.strictEqual(await tokenBalance(vault), BigInt(10 * USDC - 400_000));
  });

  // ── Boundaries ─────────────────────────────────────────────────────────────

  it("uses the feed median as local bounds: exactly +40% passes, one micro-dollar more is slashed", async () => {
    const FEED = "GROCERY:ng-lagos:rice_kg";
    const [a, b, c, d, e] = await Promise.all([1, 2, 3, 4, 5].map(newReporter));

    // Build three accepted samples via peers: 800k, 810k, 820k → median 810k.
    await submit(a, FEED, photo("r-a"), 800_000);
    await submit(b, FEED, photo("r-b"), 820_000);
    await submit(c, FEED, photo("r-c"), 810_000);
    const [ra, rb, rc] = ["r-a", "r-b", "r-c"].map((p) => reportPda(feedPda(FEED), photo(p)));
    await peerCheck(ra, rb);
    await peerCheck(ra, rc);
    for (const r of [ra, rb, rc]) await settle(r);
    assert.strictEqual((await program.account.feed.fetch(feedPda(FEED))).len, 3);

    // 810_000 * 1.40 = 1_134_000 → inside bounds, accepted with no peers at all.
    await submit(d, FEED, photo("r-d"), 1_134_000);
    const rd = reportPda(feedPda(FEED), photo("r-d"));
    await settle(rd);
    assert.strictEqual(await statusOf(rd), "accepted");

    // Median is still 810_000 (lower median of 4). 1_134_001 is just outside → slashed.
    await submit(e, FEED, photo("r-e"), 1_134_001);
    const re = reportPda(feedPda(FEED), photo("r-e"));
    await settle(re);
    assert.strictEqual(await statusOf(re), "slashed");
    assert.strictEqual(await reputation(e), 30, "−20 reputation");
    assert.strictEqual(await tokenBalance(getAssociatedTokenAddressSync(mint, e.publicKey)), 0n, "slashed reporter is not paid");
    assert.strictEqual((await program.account.config.fetch(config)).totalLocked.toNumber(), 0, "slashed lock released to the pool");
  });

  it("holds a report with no evidence until exactly the 48h timeout, then accepts a reporter in good standing", async () => {
    const FEED = "FUEL:ke-nairobi:diesel_litre";
    const a = await newReporter();
    await submit(a, FEED, photo("k-a"), 1_300_000);
    const ra = reportPda(feedPda(FEED), photo("k-a"));

    await advanceSeconds(48n * HOUR - 5n);
    await expectError(settle(ra), "StillPending", "one block short of the timeout");

    await advanceSeconds(10n);
    await settle(ra);
    assert.strictEqual(await statusOf(ra), "accepted");
  });

  // ── Abuse ──────────────────────────────────────────────────────────────────

  it("rejects a duplicate photo on-chain, and the attester can penalise the resubmitter", async () => {
    const FEED = "GROCERY:ng-lagos:bread_loaf";
    const a = await newReporter();
    const cheat = await newReporter();
    await submit(a, FEED, photo("bread-1"), 1_000_000);
    await submit(cheat, FEED, photo("cheat-own"), 1_000_000); // gives cheat a reporter account

    await expectError(submit(cheat, FEED, photo("bread-1"), 1_000_000), "AccountAlreadyInUse", "same photo, same item");

    const ix = await program.methods
      .flagDuplicate(photo("bread-1"))
      .accountsPartial({
        attester: attester.publicKey,
        config,
        existingReport: reportPda(feedPda(FEED), photo("bread-1")),
        offenderWallet: cheat.publicKey,
        offender: reporterPda(cheat.publicKey),
        systemProgram: SystemProgram.programId,
      })
      .instruction();
    await send([ix], [attester]);
    assert.strictEqual(await reputation(cheat), 40);
  });

  it("lets only the attester record a faked photo, at −15 reputation", async () => {
    const cheat = await newReporter();
    const flag = (signer: Keypair) =>
      program.methods
        .flagFake(photo("generated-receipt"))
        .accountsPartial({
          attester: signer.publicKey,
          config,
          offenderWallet: cheat.publicKey,
          offender: reporterPda(cheat.publicKey),
          systemProgram: SystemProgram.programId,
        })
        .instruction()
        .then((ix) => send([ix], [signer]));

    const outsider = Keypair.generate();
    await send([SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: outsider.publicKey, lamports: 1_000_000_000 })]);
    await expectError(flag(outsider), "ConstraintHasOne", "only the attester can slash");
    await flag(attester);
    assert.strictEqual(await reputation(cheat), 35);
  });

  it("refuses reports not vouched for by the configured attester", async () => {
    const fake = Keypair.generate();
    await send([SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: fake.publicKey, lamports: 1_000_000_000 })]);
    const a = await newReporter();
    await expectError(submit(a, "FUEL:ng-abuja:petrol_litre", photo("fake"), 900_000, fake), "ConstraintHasOne", "wrong attester");
  });

  it("stops a reporter confirming themselves, and counts each peer pair only once", async () => {
    const FEED = "GROCERY:gh-accra:sugar_kg";
    const a = await newReporter();
    const b = await newReporter();
    await submit(a, FEED, photo("s-a1"), 1_500_000);
    await submit(a, FEED, photo("s-a2"), 1_500_000);
    await submit(b, FEED, photo("s-b1"), 1_500_000);
    const [a1, a2, b1] = ["s-a1", "s-a2", "s-b1"].map((p) => reportPda(feedPda(FEED), photo(p)));

    await expectError(peerCheck(a1, a2), "SameReporter", "self-confirmation");
    await peerCheck(a1, b1);
    await nextSlot();
    await expectError(peerCheck(a1, b1), "AccountAlreadyInUse", "same pair twice");
    assert.strictEqual((await program.account.report.fetch(a1)).confirmations, 1);
  });

  it("slashes a report contradicted by a quorum of peers on a feed with no history", async () => {
    const FEED = "GROCERY:ng-kano:onions_kg";
    const [liar, p1, p2] = await Promise.all([1, 2, 3].map(newReporter));
    await submit(liar, FEED, photo("o-l"), 5_000_000);
    await submit(p1, FEED, photo("o-1"), 1_000_000);
    await submit(p2, FEED, photo("o-2"), 1_050_000);
    const [rl, r1, r2] = ["o-l", "o-1", "o-2"].map((p) => reportPda(feedPda(FEED), photo(p)));
    await peerCheck(rl, r1);
    await peerCheck(rl, r2);
    await settle(rl);
    assert.strictEqual(await statusOf(rl), "slashed");
  });

  it("will not lock more rewards than the pool holds, or settle a report twice", async () => {
    const FEED = "FUEL:ng-lagos:kerosene_litre";
    const vaultNow = Number(await tokenBalance(vault));
    const locked = (await program.account.config.fetch(config)).totalLocked.toNumber();
    const available = vaultNow - locked;
    const reward = 200_000;

    const wallets = await Promise.all(Array.from({ length: Math.floor(available / reward) }, newReporter));
    for (let i = 0; i < wallets.length; i++) await submit(wallets[i], FEED, photo(`k${i}`), 1_000_000);
    const extra = await newReporter();
    await expectError(submit(extra, FEED, photo("k-extra"), 1_000_000), "PoolExhausted", "pool fully locked");

    const first = reportPda(feedPda(FEED), photo("k0"));
    const second = reportPda(feedPda(FEED), photo("k1"));
    await peerCheck(first, second);
    await settle(first);
    await nextSlot();
    await expectError(settle(first), "AlreadySettled", "double settle");
  });
});
