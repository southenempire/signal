/**
 * One-time setup on a cluster: initialize Config + vault, then fund the reward pool.
 *
 *   ATTESTER=<bot wallet pubkey> USDC_MINT=<mint> FUND_USDC=1000 \
 *     npx ts-node scripts/init-devnet.ts
 *
 * Signs with ADMIN_KEYPAIR (default ~/.config/solana/id.json). Safe to re-run: skips initialize if
 * Config already exists, and only funds when FUND_USDC is set.
 */
import * as anchor from "@coral-xyz/anchor";
import { BN, Program } from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { readFileSync } from "fs";
import { homedir } from "os";
import { SignalOracle } from "../target/types/signal_oracle";

const { Connection, Keypair, PublicKey, SystemProgram } = anchor.web3;

async function main() {
  const rpc = process.env.RPC_URL || "https://api.devnet.solana.com";
  const adminPath = process.env.ADMIN_KEYPAIR || `${homedir()}/.config/solana/id.json`;
  const admin = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(adminPath, "utf8"))));
  const attester = new PublicKey(process.env.ATTESTER || admin.publicKey.toBase58());
  const mint = new PublicKey(process.env.USDC_MINT!);

  const provider = new anchor.AnchorProvider(new Connection(rpc, "confirmed"), new anchor.Wallet(admin), {
    commitment: "confirmed",
  });
  const program = new Program<SignalOracle>(require("../target/idl/signal_oracle.json"), provider);

  const [config] = PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId);
  const vault = getAssociatedTokenAddressSync(mint, config, true);

  if (!(await provider.connection.getAccountInfo(config))) {
    const sig = await program.methods
      .initialize({
        attester,
        baseReward: new BN(200_000), // $0.20 at reputation 50
        minBoundsSamples: 3,
        boundsToleranceBps: 4_000,
        peerToleranceBps: 2_500,
        peerQuorum: 2,
        peerWindowSecs: new BN(72 * 3600),
        pendingTimeoutSecs: new BN(48 * 3600),
        bootstrapMinReputation: 40,
        banBelowReputation: 15,
      })
      .accountsPartial({
        admin: admin.publicKey,
        usdcMint: mint,
        config,
        vault,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("initialized:", sig);
  } else {
    console.log("config already exists, skipping initialize");
  }

  const fund = Number(process.env.FUND_USDC || 0);
  if (fund > 0) {
    const sig = await program.methods
      .fundPool(new BN(Math.round(fund * 1_000_000)))
      .accountsPartial({
        funder: admin.publicKey,
        usdcMint: mint,
        config,
        funderAta: getAssociatedTokenAddressSync(mint, admin.publicKey),
        vault,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
    console.log(`funded ${fund} USDC:`, sig);
  }

  const c = await program.account.config.fetch(config);
  const v = await provider.connection.getTokenAccountBalance(vault);
  console.log({
    program: program.programId.toBase58(),
    config: config.toBase58(),
    vault: vault.toBase58(),
    attester: c.attester.toBase58(),
    pool: v.value.uiAmountString,
    locked: c.totalLocked.toString(),
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
