//! Building the Solana transactions this contract asks NEAR's MPC network to sign.
//!
//! The contract is the Signal Solana program's attester through its Chain Signatures key, so whatever
//! it gets signed is a filing on Solana. To keep that key from ever signing anything else, the
//! message is built here byte by byte for exactly two instructions of the Signal program —
//! `submit_verified_report` and `flag_fake` — with the program id, instruction and argument layout
//! fixed in code. Callers only supply a recent blockhash and the PDAs, which the Solana program
//! re-derives from their seeds and rejects if wrong, so a bad input can only make the filing fail.

pub type Pubkey = [u8; 32];

/// Signal oracle program on Solana (devnet), `HmCLsXYjktA3EaSmipee7qzDNTefJASUWaXeiafwmquS`.
pub const SIGNAL_PROGRAM: &str = "HmCLsXYjktA3EaSmipee7qzDNTefJASUWaXeiafwmquS";
pub const SYSTEM_PROGRAM: Pubkey = [0u8; 32];
/// Anchor discriminators from the program's IDL.
const SUBMIT_VERIFIED_REPORT: [u8; 8] = [69, 78, 223, 238, 190, 154, 77, 221];
const FLAG_FAKE: [u8; 8] = [39, 231, 254, 129, 9, 224, 1, 152];

pub fn pubkey(b58: &str) -> Result<Pubkey, String> {
    let bytes = bs58::decode(b58).into_vec().map_err(|_| format!("`{b58}` is not base58"))?;
    bytes.try_into().map_err(|_| format!("`{b58}` is not a 32-byte Solana address"))
}

fn compact_u16(n: usize, out: &mut Vec<u8>) {
    let mut n = n as u16;
    loop {
        let mut byte = (n & 0x7f) as u8;
        n >>= 7;
        if n != 0 {
            byte |= 0x80;
        }
        out.push(byte);
        if n == 0 {
            break;
        }
    }
}

/// A legacy Solana message with one instruction. `keys` must already be in Solana's order
/// (writable signers, read-only signers, writable, read-only) matching `header`.
fn message(header: [u8; 3], keys: &[Pubkey], blockhash: &Pubkey, program_index: u8, accounts: &[u8], data: &[u8]) -> Vec<u8> {
    let mut m = header.to_vec();
    compact_u16(keys.len(), &mut m);
    for k in keys {
        m.extend_from_slice(k);
    }
    m.extend_from_slice(blockhash);
    compact_u16(1, &mut m);
    m.push(program_index);
    compact_u16(accounts.len(), &mut m);
    m.extend_from_slice(accounts);
    compact_u16(data.len(), &mut m);
    m.extend_from_slice(data);
    m
}

pub struct VerifiedReport {
    pub attester: Pubkey,
    pub reporter_wallet: Pubkey,
    pub config: Pubkey,
    pub reporter: Pubkey,
    pub feed: Pubkey,
    pub report: Pubkey,
    pub vault: Pubkey,
    pub feed_id: [u8; 32],
    pub image_hash: [u8; 32],
    pub price: u64,
}

/// `submit_verified_report`: attester (fee payer) and reporter sign; the attester pays the rent.
pub fn submit_verified_report(r: &VerifiedReport, program: &Pubkey, blockhash: &Pubkey) -> Vec<u8> {
    // [attester ws, reporter_wallet rs, config w, reporter w, feed w, report w, vault r, system r, program r]
    let keys = [r.attester, r.reporter_wallet, r.config, r.reporter, r.feed, r.report, r.vault, SYSTEM_PROGRAM, *program];
    let mut data = SUBMIT_VERIFIED_REPORT.to_vec();
    data.extend_from_slice(&r.feed_id);
    data.extend_from_slice(&r.image_hash);
    data.extend_from_slice(&r.price.to_le_bytes());
    message([2, 1, 3], &keys, blockhash, 8, &[0, 1, 2, 3, 4, 5, 6, 7], &data)
}

pub struct FakeFlag {
    pub attester: Pubkey,
    pub config: Pubkey,
    pub offender_wallet: Pubkey,
    pub offender: Pubkey,
    pub image_hash: [u8; 32],
}

/// `flag_fake`: only the attester signs.
pub fn flag_fake(f: &FakeFlag, program: &Pubkey, blockhash: &Pubkey) -> Vec<u8> {
    // [attester ws, offender w, config r, offender_wallet r, system r, program r]
    let keys = [f.attester, f.offender, f.config, f.offender_wallet, SYSTEM_PROGRAM, *program];
    let mut data = FLAG_FAKE.to_vec();
    data.extend_from_slice(&f.image_hash);
    // IDL account order: attester, config, offender_wallet, offender, system_program
    message([1, 0, 4], &keys, blockhash, 5, &[0, 2, 3, 1, 4], &data)
}

/// A transaction ready to broadcast once any other required signers add theirs: the attester's
/// signature first, zeroed slots for the rest.
pub fn transaction(message: &[u8], signers: usize, attester_signature: &[u8; 64]) -> Vec<u8> {
    let mut tx = Vec::new();
    compact_u16(signers, &mut tx);
    tx.extend_from_slice(attester_signature);
    tx.extend(std::iter::repeat_n(0u8, 64 * (signers - 1)));
    tx.extend_from_slice(message);
    tx
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encodes_compact_lengths() {
        let enc = |n| {
            let mut v = vec![];
            compact_u16(n, &mut v);
            v
        };
        assert_eq!(enc(0), vec![0]);
        assert_eq!(enc(127), vec![0x7f]);
        assert_eq!(enc(128), vec![0x80, 0x01]);
        assert_eq!(enc(300), vec![0xac, 0x02]);
    }

    /// What a legacy message means: blockhash, and the one instruction as (program, [(account,
    /// signer, writable)], data). Key order is free in Solana; this is what must match.
    type Meaning = ([u8; 32], Pubkey, Vec<(Pubkey, bool, bool)>, Vec<u8>);

    fn meaning(m: &[u8]) -> Meaning {
        let read_len = |m: &[u8], i: &mut usize| -> usize {
            let (mut n, mut shift) = (0usize, 0);
            loop {
                let b = m[*i];
                *i += 1;
                n |= ((b & 0x7f) as usize) << shift;
                shift += 7;
                if b & 0x80 == 0 {
                    return n;
                }
            }
        };
        let (signed, ro_signed, ro_unsigned) = (m[0] as usize, m[1] as usize, m[2] as usize);
        let mut i = 3;
        let n = read_len(m, &mut i);
        let keys: Vec<Pubkey> = (0..n).map(|k| m[i + 32 * k..i + 32 * (k + 1)].try_into().unwrap()).collect();
        i += 32 * n;
        let blockhash: [u8; 32] = m[i..i + 32].try_into().unwrap();
        i += 32;
        assert_eq!(read_len(m, &mut i), 1, "one instruction");
        let program = keys[m[i] as usize];
        i += 1;
        let role = |k: usize| {
            let signer = k < signed;
            let writable = if signer { k < signed - ro_signed } else { k < n - ro_unsigned };
            (keys[k], signer, writable)
        };
        let accounts: Vec<_> = (0..read_len(m, &mut i)).map(|j| role(m[i + j] as usize)).collect();
        i += accounts.len();
        let len = read_len(m, &mut i);
        (blockhash, program, accounts, m[i..i + len].to_vec())
    }

    /// Reference messages from `@solana/web3.js` + Anchor compiling the same instructions from the
    /// program's IDL (fee payer = attester), so a layout mistake here can't reach the MPC network.
    const WEB3_SUBMIT: &str = "020103090101010101010101010101010101010101010101010101010101010101010101020202020202020202020202020202020202020202020202020202020202020203030303030303030303030303030303030303030303030303030303030303030404040404040404040404040404040404040404040404040404040404040404050505050505050505050505050505050505050505050505050505050505050506060606060606060606060606060606060606060606060606060606060606060000000000000000000000000000000000000000000000000000000000000000f90d5f1dab3f53a63526ca770bb71b9fa619588eb240eb333f3149931c33826107070707070707070707070707070707070707070707070707070707070707070a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a010708000102030405080650454edfeebe9a4ddd0808080808080808080808080808080808080808080808080808080808080808090909090909090909090909090909090909090909090909090909090909090940e2010000000000";
    const WEB3_FLAG: &str = "0100040601010101010101010101010101010101010101010101010101010101010101010404040404040404040404040404040404040404040404040404040404040404000000000000000000000000000000000000000000000000000000000000000002020202020202020202020202020202020202020202020202020202020202020303030303030303030303030303030303030303030303030303030303030303f90d5f1dab3f53a63526ca770bb71b9fa619588eb240eb333f3149931c3382610a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a01050500040301022827e7fe8109e001980909090909090909090909090909090909090909090909090909090909090909";

    #[test]
    fn means_exactly_what_solana_web3_builds() {
        let k = |n: u8| [n; 32];
        let program = pubkey(SIGNAL_PROGRAM).unwrap();
        let submit = submit_verified_report(
            &VerifiedReport {
                attester: k(1), reporter_wallet: k(2), config: k(3), reporter: k(4), feed: k(5), report: k(6),
                vault: k(7), feed_id: k(8), image_hash: k(9), price: 123_456,
            },
            &program,
            &k(10),
        );
        assert_eq!(meaning(&submit), meaning(&hex::decode(WEB3_SUBMIT).unwrap()));
        // The fee payer (the attester) must come first: it is the first signature.
        assert_eq!(&submit[4..36], &k(1));
        let flag = flag_fake(
            &FakeFlag { attester: k(1), config: k(3), offender_wallet: k(2), offender: k(4), image_hash: k(9) },
            &program,
            &k(10),
        );
        assert_eq!(meaning(&flag), meaning(&hex::decode(WEB3_FLAG).unwrap()));
        assert_eq!(&flag[4..36], &k(1));
    }

    #[test]
    fn decodes_the_program_id() {
        let p = pubkey(SIGNAL_PROGRAM).unwrap();
        assert_eq!(bs58::encode(p).into_string(), SIGNAL_PROGRAM);
        assert!(pubkey("not base58 0OIl").is_err());
        assert!(pubkey("11111111111111111111111111111111").unwrap() == SYSTEM_PROGRAM);
    }
}
