use super::*;
use k256::ecdsa::SigningKey;
use near_sdk::test_utils::{accounts, VMContextBuilder};
use near_sdk::testing_env;
use serde_json::Value;

const MODEL: &str = "Qwen/Qwen3.8-27B";
/// The model key NEAR AI's attestation report published for Qwen/Qwen3.8-27B (checked 29 Oct 2026).
const NEAR_AI_SIGNER: &str = "0x835ab53d20294ef795906dff21ae4c045336aa26";

struct Fixture {
    request: String,
    response: String,
    signature: String,
    created: u64,
}

fn fixture(json: &str) -> Fixture {
    let v: Value = serde_json::from_str(json).unwrap();
    let response = v["response"].as_str().unwrap().to_string();
    let created = serde_json::from_str::<Value>(&response).unwrap()["created"].as_u64().unwrap();
    Fixture {
        request: v["request"].as_str().unwrap().to_string(),
        response,
        signature: v["signature"]["signature"].as_str().unwrap().to_string(),
        created,
    }
}

fn accepted_receipt() -> Fixture {
    fixture(include_str!("../tests/fixtures/receipt-accepted.json"))
}

fn not_a_receipt() -> Fixture {
    fixture(include_str!("../tests/fixtures/not-a-receipt.json"))
}

/// The bot's prompt, read from the file it actually uses, so a prompt change breaks these tests.
fn bot_prompt() -> String {
    let src = include_str!("../../signal-bot/vision_prompt.js");
    let start = src.find("VISION_PROMPT = `").unwrap() + "VISION_PROMPT = `".len();
    src[start..start + src[start..].find('`').unwrap()].to_string()
}

fn at(secs: u64, predecessor: AccountId, deposit: NearToken) {
    testing_env!(VMContextBuilder::new()
        .current_account_id("oracle.testnet".parse().unwrap())
        .predecessor_account_id(predecessor)
        .block_timestamp(secs * 1_000_000_000)
        .attached_deposit(deposit)
        .build());
}

fn one_near() -> NearToken {
    NearToken::from_near(1)
}

fn setup(now: u64) -> Contract {
    at(now, accounts(0), NearToken::from_yoctonear(0));
    let mut c = Contract::new(accounts(0));
    c.register_signer(NEAR_AI_SIGNER.into(), MODEL.into(), "test".into());
    c.set_prompt(hex::encode(verify::sha256(bot_prompt().as_bytes())), true);
    c
}

// ── Real NEAR AI responses ─────────────────────────────────────────────────────

#[test]
fn accepts_a_real_signed_near_ai_audit() {
    let f = accepted_receipt();
    let mut c = setup(f.created + 60);
    at(f.created + 60, accounts(1), one_near());
    let r = c.submit_verdict(f.request, f.response, f.signature, None);

    assert_eq!(r.status, ReportStatus::Verified);
    assert_eq!(r.signer, NEAR_AI_SIGNER.trim_start_matches("0x"));
    assert_eq!(r.currency.as_deref(), Some("MYR"));
    assert_eq!(r.region, "my-johor_bahru");
    assert!(!r.items.is_empty(), "items were read from the receipt");
    assert!(r.items.iter().all(|i| matches!(i.outcome, Outcome::Accepted { .. })), "a new feed has no bounds yet");
    assert_eq!(c.reports_count(), 1);
    assert_eq!(c.get_feed(r.items[0].feed.clone()).unwrap().samples, 1);
    assert_eq!(c.report_for_image(r.image_sha256.clone()), Some(0));
    assert_eq!(c.get_reporter(accounts(1).to_string()).unwrap().verified, 1);
}

#[test]
fn records_a_rejected_photo_without_prices() {
    let f = not_a_receipt();
    let mut c = setup(f.created + 60);
    at(f.created + 60, accounts(1), one_near());
    let r = c.submit_verdict(f.request, f.response, f.signature, None);
    assert_eq!(r.status, ReportStatus::Unverified);
    assert!(r.items.is_empty());
    assert_eq!(c.feeds_count(), 0);
}

#[test]
#[should_panic(expected = "not a registered NEAR AI model key")]
fn a_single_changed_byte_breaks_the_signature() {
    let f = accepted_receipt();
    let mut c = setup(f.created + 60);
    at(f.created + 60, accounts(1), one_near());
    let forged = f.response.replacen("9.00", "1.00", 1);
    assert_ne!(forged, f.response);
    c.submit_verdict(f.request, forged, f.signature, None);
}

#[test]
#[should_panic(expected = "already filed")]
fn the_same_response_cannot_be_filed_twice() {
    let f = accepted_receipt();
    let mut c = setup(f.created + 60);
    at(f.created + 60, accounts(1), one_near());
    c.submit_verdict(f.request.clone(), f.response.clone(), f.signature.clone(), None);
    at(f.created + 61, accounts(2), one_near());
    c.submit_verdict(f.request, f.response, f.signature, None);
}

#[test]
#[should_panic(expected = "not a registered NEAR AI model key")]
fn unregistered_keys_are_refused() {
    let f = accepted_receipt();
    let mut c = setup(f.created + 60);
    c.remove_signer(NEAR_AI_SIGNER.into());
    at(f.created + 60, accounts(1), one_near());
    c.submit_verdict(f.request, f.response, f.signature, None);
}

#[test]
#[should_panic(expected = "registered Signal prompt")]
fn other_prompts_are_refused() {
    let f = accepted_receipt();
    let mut c = setup(f.created + 60);
    c.set_prompt(hex::encode(verify::sha256(bot_prompt().as_bytes())), false);
    at(f.created + 60, accounts(1), one_near());
    c.submit_verdict(f.request, f.response, f.signature, None);
}

#[test]
#[should_panic(expected = "too old")]
fn stale_responses_are_refused() {
    let f = accepted_receipt();
    let mut c = setup(f.created + 3601);
    at(f.created + 3601, accounts(1), one_near());
    c.submit_verdict(f.request, f.response, f.signature, None);
}

#[test]
#[should_panic(expected = "attach at least")]
fn storage_must_be_paid_for() {
    let f = accepted_receipt();
    let mut c = setup(f.created + 60);
    at(f.created + 60, accounts(1), NearToken::from_yoctonear(1));
    c.submit_verdict(f.request, f.response, f.signature, None);
}

// ── Crafted responses, signed by a test key, for the feed rules ────────────────

struct TestSigner {
    key: SigningKey,
    n: u32,
}

impl TestSigner {
    fn new() -> Self {
        Self { key: SigningKey::from_bytes(&[7u8; 32].into()).unwrap(), n: 0 }
    }

    fn address(&self) -> String {
        let point = self.key.verifying_key().to_encoded_point(false);
        hex::encode(&verify::keccak256(&point.as_bytes()[1..])[12..])
    }

    /// A request/response pair as NEAR AI would produce it, and its signature.
    fn audit(&mut self, now: u64, verdict: Value) -> (String, String, String) {
        self.n += 1;
        let image = hex::encode(verify::sha256(format!("photo {}", self.n).as_bytes()));
        let request = serde_json::json!({
            "model": MODEL, "temperature": 0.1, "max_tokens": 3072,
            "chat_template_kwargs": { "enable_thinking": false },
            "messages": [{ "role": "user", "content": [
                { "type": "text", "text": format!("{}\n\nThe user labelled this photo as: GROCERY. The user's region is: ng-lagos.", bot_prompt()) },
                { "type": "image_url", "image_url": { "url": format!("https://bot.example/img/{}?sha256={image}", self.n) } },
            ] }],
        })
        .to_string();
        let response = serde_json::json!({
            "id": format!("chat-{}", self.n), "object": "chat.completion", "model": MODEL, "created": now,
            "choices": [{ "index": 0, "finish_reason": "stop",
                "message": { "role": "assistant", "content": format!("```json\n{verdict}\n```") } }],
        })
        .to_string();

        let text = verify::signed_text(MODEL, request.as_bytes(), response.as_bytes());
        let mut prefixed = format!("\x19Ethereum Signed Message:\n{}", text.len()).into_bytes();
        prefixed.extend_from_slice(text.as_bytes());
        let (sig, rec) = self.key.sign_prehash_recoverable(&verify::keccak256(&prefixed)).unwrap();
        let mut bytes = sig.to_bytes().to_vec();
        bytes.push(rec.to_byte() + 27);
        (request, response, format!("0x{}", hex::encode(bytes)))
    }
}

fn bread(price: f64) -> Value {
    serde_json::json!({ "verified": true, "fraudSuspected": false, "reason": "ok", "category": "GROCERY", "currency": "NGN",
        "store": null, "items": [{ "name": "Bread", "canonicalItem": "bread_loaf", "quantity": 1, "unitPrice": price }] })
}

const NOW: u64 = 1_800_000_000;
const FEED_KEY: &str = "GROCERY:ng-lagos:bread_loaf";

fn with_test_signer() -> (Contract, TestSigner) {
    let mut c = setup(NOW);
    let s = TestSigner::new();
    c.register_signer(s.address(), MODEL.into(), "test".into());
    c.set_relayer(accounts(5), true);
    (c, s)
}

fn file(c: &mut Contract, s: &mut TestSigner, reporter: &str, verdict: Value) -> Report {
    at(NOW, accounts(5), one_near());
    let (req, res, sig) = s.audit(NOW, verdict);
    c.submit_verdict(req, res, sig, Some(reporter.into()))
}

#[test]
fn colluders_are_held_and_a_quorum_moves_the_feed() {
    let (mut c, mut s) = with_test_signer();
    for (who, price) in [("tg:a", 2000.0), ("tg:b", 2050.0), ("tg:c", 2020.0)] {
        file(&mut c, &mut s, who, bread(price));
    }
    assert_eq!(c.get_feed(FEED_KEY.into()).unwrap().median, Some(202_000));

    // Two wallets vouching for each other's off-market price stay held.
    let x = file(&mut c, &mut s, "tg:x", bread(6000.0));
    let y = file(&mut c, &mut s, "tg:y", bread(6000.0));
    assert_eq!(x.items[0].outcome, Outcome::Held);
    assert_eq!(y.items[0].outcome, Outcome::Held);
    assert_eq!(c.get_feed(FEED_KEY.into()).unwrap().samples, 3);

    // A third independent reporter completes the quorum: all three join the feed.
    let z = file(&mut c, &mut s, "tg:z", bread(5900.0));
    assert_eq!(z.items[0].outcome, Outcome::Accepted { promoted: vec![x.id, y.id] });
    assert_eq!(c.get_report(x.id).unwrap().items[0].outcome, Outcome::Accepted { promoted: vec![] });
    assert_eq!(c.get_reporter("tg:x".into()).unwrap().items_accepted, 1);
    assert_eq!(c.get_feed(FEED_KEY.into()).unwrap().samples, 6);
}

#[test]
fn fraud_is_recorded_and_never_priced() {
    let (mut c, mut s) = with_test_signer();
    let mut v = bread(100.0);
    v["verified"] = false.into();
    v["fraudSuspected"] = true.into();
    let r = file(&mut c, &mut s, "tg:f", v);
    assert_eq!(r.status, ReportStatus::Fraud);
    assert!(r.items.is_empty());
    assert_eq!(c.get_reporter("tg:f".into()).unwrap().fraud, 1);
}

#[test]
fn a_feed_keeps_one_currency() {
    let (mut c, mut s) = with_test_signer();
    file(&mut c, &mut s, "tg:a", bread(2000.0));
    let mut v = bread(20.0);
    v["currency"] = "KES".into();
    let r = file(&mut c, &mut s, "tg:b", v);
    assert_eq!(r.items[0].outcome, Outcome::Rejected { reason: "feed is priced in NGN".into() });
}

#[test]
#[should_panic(expected = "only a relayer")]
fn only_relayers_name_reporters() {
    let (mut c, mut s) = with_test_signer();
    at(NOW, accounts(3), one_near());
    let (req, res, sig) = s.audit(NOW, bread(2000.0));
    c.submit_verdict(req, res, sig, Some("tg:someone".into()));
}

#[test]
fn anyone_can_file_as_themselves() {
    let (mut c, mut s) = with_test_signer();
    at(NOW, accounts(3), one_near());
    let (req, res, sig) = s.audit(NOW, bread(2000.0));
    let r = c.submit_verdict(req, res, sig, None);
    assert_eq!(r.reporter, accounts(3).to_string());
    assert_eq!(r.submitter, accounts(3));
}

#[test]
#[should_panic(expected = "only the owner")]
fn only_the_owner_registers_keys() {
    let (mut c, _) = with_test_signer();
    at(NOW, accounts(3), NearToken::from_yoctonear(0));
    c.register_signer("0x0000000000000000000000000000000000000001".into(), MODEL.into(), "x".into());
}
