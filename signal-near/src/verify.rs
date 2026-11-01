//! Checking NEAR AI's response signatures on-chain.
//!
//! NEAR AI signs `<model>:<sha256(request bytes)>:<sha256(response bytes)>` inside the model's TEE
//! with an Ethereum-style key (EIP-191 personal-sign). The key's address is published in the model's
//! attestation report and registered in this contract after that report is verified.

use near_sdk::env;

pub type Address = [u8; 20];

pub fn sha256(bytes: &[u8]) -> [u8; 32] {
    env::sha256_array(bytes)
}

pub fn keccak256(bytes: &[u8]) -> [u8; 32] {
    env::keccak256_array(bytes)
}

/// The exact text NEAR AI signs for a completion.
pub fn signed_text(model: &str, request: &[u8], response: &[u8]) -> String {
    format!("{}:{}:{}", model, hex::encode(sha256(request)), hex::encode(sha256(response)))
}

/// Recover the Ethereum address that personal-signed `message` (EIP-191), or None if the
/// signature is malformed or malleable.
pub fn recover_signer(message: &[u8], signature: &[u8; 65]) -> Option<Address> {
    let mut prefixed = format!("\x19Ethereum Signed Message:\n{}", message.len()).into_bytes();
    prefixed.extend_from_slice(message);
    let hash = keccak256(&prefixed);

    let v = match signature[64] {
        27 | 28 => signature[64] - 27,
        0 | 1 => signature[64],
        _ => return None,
    };
    let public_key = env::ecrecover(&hash, &signature[..64], v, true)?;
    let mut address = [0u8; 20];
    address.copy_from_slice(&keccak256(&public_key)[12..]);
    Some(address)
}

/// Parse a `0x`-prefixed (or bare) hex signature of 65 bytes.
pub fn parse_signature(hex_sig: &str) -> Option<[u8; 65]> {
    let bytes = hex::decode(hex_sig.trim_start_matches("0x")).ok()?;
    bytes.try_into().ok()
}

/// Parse a `0x`-prefixed (or bare) 20-byte address.
pub fn parse_address(hex_addr: &str) -> Option<Address> {
    let bytes = hex::decode(hex_addr.trim_start_matches("0x")).ok()?;
    bytes.try_into().ok()
}
