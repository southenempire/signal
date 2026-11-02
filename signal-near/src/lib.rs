//! Signal on NEAR: a crowdsourced price oracle that only trusts what NEAR AI's attested model saw.
//!
//! A reporter photographs a receipt. NEAR AI's TEE-hosted vision model audits it with Signal's
//! prompt and signs `<model>:<sha256(request)>:<sha256(response)>`. `submit_verdict` takes the raw
//! request and response, hashes them itself, recovers the signer, and accepts the prices only if:
//!   - the signer is a model key registered from a verified attestation report,
//!   - the request is Signal's registered prompt with one image (by URL + sha256, never the photo),
//!   - the response is fresh, finished, and was not submitted before,
//!   - the photo was not submitted before.
//!
//! The photo's hash is only a claim in the image URL, so it is trusted only when the photo is served
//! by a host the owner registered (the Signal bot hashes what it serves). Photos from other hosts
//! are still filed, but can only add prices inside an established feed's bounds: they cannot start
//! a feed, wait for peers, or vouch for anyone.
//!
//! Nobody — including the Signal bot — can put a price on-chain the model did not read.

mod audit;
mod feed;
mod solana;
mod verify;

pub use feed::{Outcome, Params, FEED_CAPACITY};

use feed::{Feed, Held};
use near_sdk::json_types::Base64VecU8;
use near_sdk::store::{IterableMap, IterableSet, LookupMap, LookupSet, Vector};
use std::collections::HashSet;
use near_sdk::{env, log, near, require, AccountId, BorshStorageKey, Gas, NearToken, PanicOnDefault, Promise, PromiseError};

#[near(serializers = [borsh])]
#[derive(BorshStorageKey)]
enum StorageKey {
    Signers,
    Prompts,
    Relayers,
    Feeds,
    Reports,
    Reporters,
    SeenImages,
    SeenResponses,
    TrustedHosts,
    SolanaWallets,
    SolanaFraudFiled,
}

/// Chain Signatures settings for filing on Solana (see `solana.rs`).
#[near(serializers = [json])]
#[derive(Clone, Debug)]
pub struct SolanaSettings {
    /// The MPC signer contract (`v1.signer-prod.testnet` on testnet).
    pub mpc_signer: AccountId,
    /// Derivation path of this contract's Solana key.
    pub path: String,
    /// That key's Solana address (the MPC contract's `derived_public_key` for this account and
    /// path), which the Signal Solana program has as its attester. Fee payer of every filing.
    pub attester: String,
}

/// Addresses for a Solana filing. The Solana program re-derives each PDA from its seeds and rejects
/// the filing if any is wrong, so these can't redirect anything.
#[near(serializers = [json])]
pub struct ReportAccounts {
    pub config: String,
    pub reporter: String,
    pub feed: String,
    pub report: String,
    pub vault: String,
}

#[near(serializers = [json])]
pub struct FraudAccounts {
    pub config: String,
    pub offender: String,
}

const SOLANA_SETTINGS_KEY: &[u8] = b"solana";
const MPC_SIGN_GAS: Gas = Gas::from_tgas(50);
const ON_SIGNED_GAS: Gas = Gas::from_tgas(10);

fn solana_settings() -> Option<SolanaSettings> {
    env::storage_read(SOLANA_SETTINGS_KEY).and_then(|b| serde_json::from_slice(&b).ok())
}

/// Each reporter's Solana wallet, where their rewards and reputation live on Solana.
fn solana_wallets() -> LookupMap<String, String> {
    LookupMap::new(StorageKey::SolanaWallets)
}

/// Fraud reports already sent for signing: a fake must be penalised on Solana once, not per retry.
fn solana_fraud_filed() -> LookupSet<u64> {
    LookupSet::new(StorageKey::SolanaFraudFiled)
}

fn solana_key(b58: &str) -> solana::Pubkey {
    solana::pubkey(b58).unwrap_or_else(|e| env::panic_str(&e))
}

// Small flags kept in their own storage keys rather than the contract struct, so adding them needed
// no state migration.
const PAUSED_KEY: &[u8] = b"paused";
const PENDING_OWNER_KEY: &[u8] = b"pending_owner";

fn paused_flag() -> bool {
    env::storage_has_key(PAUSED_KEY)
}

fn pending_owner_value() -> Option<AccountId> {
    env::storage_read(PENDING_OWNER_KEY).and_then(|b| String::from_utf8(b).ok()?.parse().ok())
}

/// Hosts whose image URLs carry a sha256 the host computed itself. Kept outside the contract
/// struct (a LookupSet holds no inline state and writes straight to storage), so adding it needed
/// no state migration.
fn trusted_hosts() -> LookupSet<String> {
    LookupSet::new(StorageKey::TrustedHosts)
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct Signer {
    pub model: String,
    /// sha256 of the attestation report this key was verified from, for auditors.
    pub attestation_sha256: String,
    pub registered_at_secs: u64,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub enum ReportStatus {
    /// The model verified the photo; see each item's outcome.
    Verified,
    /// The model could not verify the photo (not a receipt, unreadable, a screenshot...).
    Unverified,
    /// The model judged the photo a deliberate fake.
    Fraud,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct ItemResult {
    pub feed: String,
    /// Unit price in minor units (cents) of `currency`.
    pub price: u64,
    pub outcome: Outcome,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct Report {
    pub id: u64,
    pub reporter: String,
    pub submitter: AccountId,
    pub status: ReportStatus,
    pub reason: String,
    pub category: String,
    pub currency: Option<String>,
    pub region: String,
    pub items: Vec<ItemResult>,
    pub model: String,
    pub signer: String,
    pub completion_id: String,
    pub request_sha256: String,
    pub response_sha256: String,
    pub image_sha256: String,
    pub submitted_at_secs: u64,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, Default)]
pub struct ReporterStats {
    pub reports: u64,
    pub verified: u64,
    pub fraud: u64,
    pub items_accepted: u64,
    pub items_held: u64,
}

#[near(serializers = [json])]
pub struct FeedView {
    pub feed: String,
    pub currency: String,
    /// Lower median of the last FEED_CAPACITY accepted prices, in minor units.
    pub median: Option<u64>,
    pub samples: u32,
    pub accepted_total: u64,
    pub prices: Vec<u64>,
    pub held: Vec<Held>,
    pub updated_at_secs: u64,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    owner: AccountId,
    params: Params,
    /// Ethereum-style address (hex, no 0x) → the model key it belongs to.
    signers: LookupMap<String, Signer>,
    /// sha256 (hex) of every accepted prompt version.
    prompts: IterableSet<String>,
    /// Accounts allowed to file on behalf of their own users (the Signal Telegram bot).
    relayers: IterableSet<AccountId>,
    feeds: IterableMap<String, Feed>,
    reports: Vector<Report>,
    reporters: LookupMap<String, ReporterStats>,
    seen_images: LookupMap<[u8; 32], u64>,
    seen_responses: LookupMap<[u8; 32], u64>,
}

fn event(name: &str, data: serde_json::Value) {
    log!(
        "EVENT_JSON:{}",
        serde_json::json!({ "standard": "signal", "version": "1.0.0", "event": name, "data": [data] })
    );
}

fn to_minor_units(price: f64) -> Option<u64> {
    let cents = (price * 100.0).round();
    (price.is_finite() && (1.0..1e15).contains(&cents)).then_some(cents as u64)
}

#[near]
impl Contract {
    #[init]
    pub fn new(owner: AccountId) -> Self {
        Self {
            owner,
            params: Params::default(),
            signers: LookupMap::new(StorageKey::Signers),
            prompts: IterableSet::new(StorageKey::Prompts),
            relayers: IterableSet::new(StorageKey::Relayers),
            feeds: IterableMap::new(StorageKey::Feeds),
            reports: Vector::new(StorageKey::Reports),
            reporters: LookupMap::new(StorageKey::Reporters),
            seen_images: LookupMap::new(StorageKey::SeenImages),
            seen_responses: LookupMap::new(StorageKey::SeenResponses),
        }
    }

    // ── Filing ──────────────────────────────────────────────────────────────

    /// File a signed receipt audit. `request` and `response` are the exact bytes exchanged with
    /// NEAR AI; `signature` is the `provider_tee` ECDSA signature from `/v1/signature/<id>`.
    /// A relayer may name the `reporter` it files for; everyone else files as themselves.
    /// Attach enough NEAR to cover the storage this adds; the rest is refunded.
    #[payable]
    pub fn submit_verdict(&mut self, request: String, response: String, signature: String, reporter: Option<String>) -> Report {
        require!(!paused_flag(), "filing is paused by the owner");
        let storage_before = env::storage_usage();
        let submitter = env::predecessor_account_id();
        let reporter = match reporter {
            Some(r) => {
                require!(self.relayers.contains(&submitter), "only a relayer can file for someone else");
                require!(!r.is_empty() && r.len() <= 64, "reporter id must be 1-64 characters");
                // Namespaced by the relayer: '/' never appears in an account id, so a relayer can
                // neither impersonate a NEAR account nor another relayer's users.
                format!("{submitter}/{r}")
            }
            None => submitter.to_string(),
        };

        let req = audit::parse_request(request.as_bytes()).unwrap_or_else(|e| env::panic_str(&e));
        let res = audit::parse_response(response.as_bytes()).unwrap_or_else(|e| env::panic_str(&e));
        require!(req.model == res.model, "the response came from a different model than requested");
        require!(self.prompts.contains(&hex::encode(req.prompt_hash)), "the request did not use a registered Signal prompt");

        let sig = verify::parse_signature(&signature).unwrap_or_else(|| env::panic_str("signature must be 65 bytes of hex"));
        let text = verify::signed_text(&req.model, request.as_bytes(), response.as_bytes());
        let address = verify::recover_signer(text.as_bytes(), &sig).unwrap_or_else(|| env::panic_str("invalid signature"));
        let signer_hex = hex::encode(address);
        let signer = self.signers.get(&signer_hex).unwrap_or_else(|| env::panic_str("signed by a key that is not a registered NEAR AI model key"));
        require!(signer.model == req.model, "this key is registered for a different model");

        let now = env::block_timestamp() / 1_000_000_000;
        require!(res.created <= now + 300, "the response is from the future");
        require!(now - res.created.min(now) <= self.params.max_response_age_secs, "the signed response is too old");

        let response_sha256 = verify::sha256(response.as_bytes());
        require!(!self.seen_responses.contains_key(&response_sha256), "this response was already filed");
        require!(!self.seen_images.contains_key(&req.image_sha256), "this photo was already filed");

        let verdict = audit::parse_verdict(&res.content).unwrap_or_default();
        let category = verdict.category.clone().unwrap_or_else(|| req.label.clone());
        let region = audit::region_for(&verdict, req.region.as_deref());
        let id = self.reports.len() as u64;

        let status = if verdict.fraud_suspected {
            ReportStatus::Fraud
        } else if verdict.verified {
            ReportStatus::Verified
        } else {
            ReportStatus::Unverified
        };

        let bound = trusted_hosts().contains(&req.image_host);
        let mut items = Vec::new();
        let mut seen_feeds = HashSet::new();
        if status == ReportStatus::Verified {
            for item in &verdict.items {
                let feed_key = audit::feed_key(&category, &region, &item.canonical_item, verdict.currency.as_deref());
                let first = seen_feeds.insert(feed_key.clone());
                let outcome = match (to_minor_units(item.unit_price), verdict.currency.as_ref()) {
                    // One price per feed per photo, so a receipt can't stack a feed with repeats.
                    _ if !first => Outcome::Rejected { reason: "item already priced in this report".into() },
                    (None, _) => Outcome::Rejected { reason: "price is not positive".into() },
                    (_, None) => Outcome::Rejected { reason: "no currency on the receipt".into() },
                    (Some(price), Some(currency)) => {
                        let mut feed = self.feeds.remove(&feed_key).unwrap_or_else(|| Feed::new(currency.clone()));
                        let outcome = feed.offer(id, &reporter, price, bound, now, &self.params);
                        // A rejected first price must not leave an empty feed behind.
                        if !feed.prices.is_empty() || !feed.held.is_empty() {
                            self.feeds.insert(feed_key.clone(), feed);
                        }
                        outcome
                    }
                };
                items.push(ItemResult {
                    feed: feed_key,
                    price: to_minor_units(item.unit_price).unwrap_or(0),
                    outcome,
                });
            }
        }

        let mut stats = self.reporters.get(&reporter).cloned().unwrap_or_default();
        stats.reports += 1;
        match status {
            ReportStatus::Verified => stats.verified += 1,
            ReportStatus::Fraud => stats.fraud += 1,
            ReportStatus::Unverified => {}
        }
        stats.items_accepted += items.iter().filter(|i| matches!(i.outcome, Outcome::Accepted { .. })).count() as u64;
        stats.items_held += items.iter().filter(|i| i.outcome == Outcome::Held).count() as u64;
        self.reporters.insert(reporter.clone(), stats);

        let report = Report {
            id,
            reporter,
            submitter: submitter.clone(),
            status,
            reason: verdict.reason,
            category,
            currency: verdict.currency,
            region,
            items,
            model: req.model,
            signer: signer_hex,
            completion_id: res.id,
            request_sha256: hex::encode(verify::sha256(request.as_bytes())),
            response_sha256: hex::encode(response_sha256),
            image_sha256: hex::encode(req.image_sha256),
            submitted_at_secs: now,
        };
        self.reports.push(report.clone());
        self.seen_images.insert(req.image_sha256, id);
        self.seen_responses.insert(response_sha256, id);
        self.held_reports_promoted(&report);

        event("verdict_filed", serde_json::to_value(&report).unwrap_or_default());
        self.charge_storage(storage_before, &submitter);
        report
    }

    // ── Filing on Solana (Chain Signatures) ─────────────────────────────────

    /// Register the Solana wallet a reporter's rewards and reputation go to. A relayer registers its
    /// users' wallets (`reporter` = the id it files them under); anyone else registers their own.
    pub fn register_solana_wallet(&mut self, wallet: String, reporter: Option<String>) {
        let caller = env::predecessor_account_id();
        let reporter = match reporter {
            Some(r) => {
                require!(self.relayers.contains(&caller), "only a relayer can register for someone else");
                format!("{caller}/{r}")
            }
            None => caller.to_string(),
        };
        solana_key(&wallet);
        let mut wallets = solana_wallets();
        wallets.insert(reporter.clone(), wallet.clone());
        wallets.flush();
        event("solana_wallet_registered", serde_json::json!({ "reporter": reporter, "wallet": wallet }));
    }

    /// Have the MPC network sign the Solana filing of one accepted price from a report. Anyone may
    /// call it: the price, photo hash and reporter come from the report, and a second filing of the
    /// same photo and item is refused by the Solana program itself, so retries are harmless.
    /// Returns the transaction (base64) with this contract's signature; the reporter adds theirs.
    pub fn sign_solana_report(&mut self, report_id: u64, item_index: u32, accounts: ReportAccounts, recent_blockhash: String) -> Promise {
        require!(!paused_flag(), "filing is paused by the owner");
        let settings = solana_settings().unwrap_or_else(|| env::panic_str("Solana filing is not configured"));
        let report = self.reports.get(report_id as u32).unwrap_or_else(|| env::panic_str("no such report"));
        require!(report.status == ReportStatus::Verified, "only verified reports are filed on Solana");
        let item = report.items.get(item_index as usize).unwrap_or_else(|| env::panic_str("no such item"));
        require!(matches!(item.outcome, Outcome::Accepted { .. }), "only accepted prices are filed on Solana");
        let wallet = solana_wallets().get(&report.reporter).cloned().unwrap_or_else(|| env::panic_str("the reporter has no Solana wallet registered"));
        let image_hash: [u8; 32] = hex::decode(&report.image_sha256).ok().and_then(|b| b.try_into().ok()).unwrap_or_else(|| env::panic_str("bad photo hash"));

        let message = solana::submit_verified_report(
            &solana::VerifiedReport {
                attester: solana_key(&settings.attester),
                reporter_wallet: solana_key(&wallet),
                config: solana_key(&accounts.config),
                reporter: solana_key(&accounts.reporter),
                feed: solana_key(&accounts.feed),
                report: solana_key(&accounts.report),
                vault: solana_key(&accounts.vault),
                feed_id: verify::sha256(item.feed.as_bytes()),
                image_hash,
                price: item.price,
            },
            &solana_key(solana::SIGNAL_PROGRAM),
            &solana_key(&recent_blockhash),
        );
        Self::request_mpc_signature(&settings, message, 2, None)
    }

    /// Have the MPC network sign the Solana penalty for a photo NEAR AI judged a fake. Relayers and
    /// the owner only, and once per report: unlike a filing, a penalty would repeat if re-sent.
    pub fn sign_solana_fraud(&mut self, report_id: u64, accounts: FraudAccounts, recent_blockhash: String) -> Promise {
        require!(!paused_flag(), "filing is paused by the owner");
        let caller = env::predecessor_account_id();
        require!(caller == self.owner || self.relayers.contains(&caller), "only a relayer or the owner can file penalties");
        let settings = solana_settings().unwrap_or_else(|| env::panic_str("Solana filing is not configured"));
        let report = self.reports.get(report_id as u32).unwrap_or_else(|| env::panic_str("no such report"));
        require!(report.status == ReportStatus::Fraud, "only fraud reports are penalised");
        let wallet = solana_wallets().get(&report.reporter).cloned().unwrap_or_else(|| env::panic_str("the reporter has no Solana wallet registered"));
        let image_hash: [u8; 32] = hex::decode(&report.image_sha256).ok().and_then(|b| b.try_into().ok()).unwrap_or_else(|| env::panic_str("bad photo hash"));
        require!(solana_fraud_filed().insert(report_id), "this penalty was already sent for signing");

        let message = solana::flag_fake(
            &solana::FakeFlag {
                attester: solana_key(&settings.attester),
                config: solana_key(&accounts.config),
                offender_wallet: solana_key(&wallet),
                offender: solana_key(&accounts.offender),
                image_hash,
            },
            &solana_key(solana::SIGNAL_PROGRAM),
            &solana_key(&recent_blockhash),
        );
        Self::request_mpc_signature(&settings, message, 1, Some(report_id))
    }

    /// The MPC network's answer: assemble the signed transaction.
    #[private]
    pub fn on_solana_signed(
        &mut self,
        #[callback_result] signed: Result<serde_json::Value, PromiseError>,
        message: Base64VecU8,
        signers: u8,
        fraud_report: Option<u64>,
    ) -> Option<Base64VecU8> {
        let signature: Option<[u8; 64]> = signed.ok().and_then(|v| {
            (v.get("scheme")?.as_str()? == "Ed25519").then_some(())?;
            let bytes: Vec<u8> = v.get("signature")?.as_array()?.iter().map(|b| b.as_u64().map(|b| b as u8)).collect::<Option<_>>()?;
            bytes.try_into().ok()
        });
        let Some(signature) = signature else {
            // Let a failed penalty be retried.
            if let Some(id) = fraud_report {
                solana_fraud_filed().remove(&id);
            }
            log!("MPC signing failed");
            return None;
        };
        event("solana_signed", serde_json::json!({ "fraud_report": fraud_report, "signers": signers }));
        Some(solana::transaction(&message.0, signers as usize, &signature).into())
    }

    // ── Owner ───────────────────────────────────────────────────────────────

    pub fn set_solana_settings(&mut self, settings: SolanaSettings) {
        self.only_owner();
        solana_key(&settings.attester);
        require!(!settings.path.is_empty(), "path is required");
        env::storage_write(SOLANA_SETTINGS_KEY, &serde_json::to_vec(&settings).unwrap_or_default());
        event("solana_settings_set", serde_json::json!({ "mpc_signer": settings.mpc_signer, "path": settings.path, "attester": settings.attester }));
    }

    /// Register a NEAR AI model signing key, after verifying the model's attestation report off-chain
    /// (TDX quote, NVIDIA GPU evidence, and that the report binds this signing address).
    pub fn register_signer(&mut self, address: String, model: String, attestation_sha256: String) {
        self.only_owner();
        let address = verify::parse_address(&address).unwrap_or_else(|| env::panic_str("address must be 20 bytes of hex"));
        require!(!model.is_empty(), "model is required");
        let signer = Signer { model, attestation_sha256, registered_at_secs: env::block_timestamp() / 1_000_000_000 };
        event("signer_registered", serde_json::json!({ "address": hex::encode(address), "model": signer.model, "attestation_sha256": signer.attestation_sha256 }));
        self.signers.insert(hex::encode(address), signer);
    }

    pub fn remove_signer(&mut self, address: String) {
        self.only_owner();
        let address = verify::parse_address(&address).unwrap_or_else(|| env::panic_str("address must be 20 bytes of hex"));
        self.signers.remove(&hex::encode(address));
        event("signer_removed", serde_json::json!({ "address": hex::encode(address) }));
    }

    /// Allow (or retire) a prompt version, by the sha256 hex of its exact text.
    pub fn set_prompt(&mut self, prompt_sha256: String, allowed: bool) {
        self.only_owner();
        require!(prompt_sha256.len() == 64 && hex::decode(&prompt_sha256).is_ok(), "prompt hash must be 64 hex characters");
        let key = prompt_sha256.to_lowercase();
        if allowed {
            self.prompts.insert(key.clone());
        } else {
            self.prompts.remove(&key);
        }
        event("prompt_set", serde_json::json!({ "prompt_sha256": key, "allowed": allowed }));
    }

    /// Trust (or stop trusting) an image host: one that serves photos at URLs carrying the sha256 it
    /// computed itself, such as the Signal bot. Hostname only, lowercase (e.g. `bot.example.app`).
    pub fn set_trusted_host(&mut self, host: String, trusted: bool) {
        self.only_owner();
        require!(audit::valid_host(&host), "host must be a lowercase hostname");
        let mut hosts = trusted_hosts();
        if trusted {
            hosts.insert(host.clone());
        } else {
            hosts.remove(&host);
        }
        event("trusted_host_set", serde_json::json!({ "host": host, "trusted": trusted }));
    }

    pub fn set_relayer(&mut self, account: AccountId, allowed: bool) {
        self.only_owner();
        if allowed {
            self.relayers.insert(account);
        } else {
            self.relayers.remove(&account);
        }
    }

    pub fn set_params(&mut self, params: Params) {
        self.only_owner();
        params.validate();
        self.params = params;
    }

    /// Stop (or resume) all filings at once, e.g. if a key leaks. Views keep working.
    pub fn set_paused(&mut self, paused: bool) {
        self.only_owner();
        if paused {
            env::storage_write(PAUSED_KEY, &[1]);
        } else {
            env::storage_remove(PAUSED_KEY);
        }
        event("paused_set", serde_json::json!({ "paused": paused }));
    }

    /// Step one of an ownership transfer. Nothing changes until `owner` calls `accept_owner`, so a
    /// typo can't hand the contract to an account nobody controls.
    pub fn propose_owner(&mut self, owner: AccountId) {
        self.only_owner();
        env::storage_write(PENDING_OWNER_KEY, owner.as_bytes());
        event("owner_proposed", serde_json::json!({ "owner": owner }));
    }

    pub fn accept_owner(&mut self) {
        let caller = env::predecessor_account_id();
        require!(pending_owner_value().as_ref() == Some(&caller), "only the proposed owner can accept");
        env::storage_remove(PENDING_OWNER_KEY);
        event("owner_changed", serde_json::json!({ "from": self.owner, "to": caller }));
        self.owner = caller;
    }

    // ── Views ───────────────────────────────────────────────────────────────

    pub fn get_owner(&self) -> AccountId {
        self.owner.clone()
    }

    pub fn get_pending_owner(&self) -> Option<AccountId> {
        pending_owner_value()
    }

    pub fn is_paused(&self) -> bool {
        paused_flag()
    }

    pub fn get_solana_settings(&self) -> Option<SolanaSettings> {
        solana_settings()
    }

    pub fn get_solana_wallet(&self, reporter: String) -> Option<String> {
        solana_wallets().get(&reporter).cloned()
    }

    pub fn get_params(&self) -> Params {
        self.params.clone()
    }

    pub fn get_signer(&self, address: String) -> Option<Signer> {
        verify::parse_address(&address).and_then(|a| self.signers.get(&hex::encode(a)).cloned())
    }

    pub fn get_prompts(&self) -> Vec<String> {
        self.prompts.iter().cloned().collect()
    }

    pub fn is_trusted_host(&self, host: String) -> bool {
        trusted_hosts().contains(&host)
    }

    pub fn is_relayer(&self, account: AccountId) -> bool {
        self.relayers.contains(&account)
    }

    pub fn get_feed(&self, feed: String) -> Option<FeedView> {
        self.feeds.get(&feed).map(|f| Self::feed_view(&feed, f))
    }

    pub fn list_feeds(&self, from_index: Option<u32>, limit: Option<u32>) -> Vec<FeedView> {
        self.feeds
            .iter()
            .skip(from_index.unwrap_or(0) as usize)
            .take(limit.unwrap_or(50).min(100) as usize)
            .map(|(k, f)| Self::feed_view(k, f))
            .collect()
    }

    pub fn feeds_count(&self) -> u32 {
        self.feeds.len()
    }

    pub fn get_report(&self, id: u64) -> Option<Report> {
        self.reports.get(id as u32).cloned()
    }

    pub fn list_reports(&self, from_index: Option<u64>, limit: Option<u64>) -> Vec<Report> {
        let from = from_index.unwrap_or(0) as u32;
        let to = (from as u64 + limit.unwrap_or(20).min(50)).min(self.reports.len() as u64) as u32;
        (from..to).filter_map(|i| self.reports.get(i).cloned()).collect()
    }

    pub fn reports_count(&self) -> u64 {
        self.reports.len() as u64
    }

    pub fn get_reporter(&self, reporter: String) -> Option<ReporterStats> {
        self.reporters.get(&reporter).cloned()
    }

    /// The report that filed this photo (sha256 hex), if any.
    pub fn report_for_image(&self, image_sha256: String) -> Option<u64> {
        let hash: [u8; 32] = hex::decode(&image_sha256).ok()?.try_into().ok()?;
        self.seen_images.get(&hash).copied()
    }

    // ── Internal ────────────────────────────────────────────────────────────

    fn request_mpc_signature(settings: &SolanaSettings, message: Vec<u8>, signers: u8, fraud_report: Option<u64>) -> Promise {
        let args = serde_json::json!({
            "request": { "path": settings.path, "payload_v2": { "Eddsa": hex::encode(&message) }, "domain_id": 1 }
        });
        Promise::new(settings.mpc_signer.clone())
            .function_call("sign", args.to_string().into_bytes(), NearToken::from_yoctonear(1), MPC_SIGN_GAS)
            .then(Self::ext(env::current_account_id()).with_static_gas(ON_SIGNED_GAS).on_solana_signed(message.into(), signers, fraud_report))
    }

    fn only_owner(&self) {
        require!(env::predecessor_account_id() == self.owner, "only the owner can do this");
    }

    fn feed_view(feed: &str, f: &Feed) -> FeedView {
        FeedView {
            feed: feed.to_string(),
            currency: f.currency.clone(),
            median: f.median(),
            samples: f.prices.len() as u32,
            accepted_total: f.accepted_total,
            prices: f.prices.clone(),
            held: f.held.clone(),
            updated_at_secs: f.updated_at_secs,
        }
    }

    /// A price that completed a quorum also accepts the held reports it agreed with.
    fn held_reports_promoted(&mut self, report: &Report) {
        for item in &report.items {
            let Outcome::Accepted { promoted } = &item.outcome else { continue };
            for &held_id in promoted {
                let Some(held) = self.reports.get_mut(held_id as u32) else { continue };
                let mut reporter = None;
                for held_item in held.items.iter_mut().filter(|i| i.feed == item.feed && i.outcome == Outcome::Held) {
                    held_item.outcome = Outcome::Accepted { promoted: vec![] };
                    reporter = Some(held.reporter.clone());
                }
                if let Some(reporter) = reporter {
                    if let Some(stats) = self.reporters.get_mut(&reporter) {
                        stats.items_held = stats.items_held.saturating_sub(1);
                        stats.items_accepted += 1;
                    }
                    event("held_accepted", serde_json::json!({ "report": held_id, "feed": item.feed, "by_report": report.id }));
                }
            }
        }
    }

    fn charge_storage(&mut self, before: u64, payer: &AccountId) {
        // store collections write lazily at the end of the call; flush so the usage is measurable now.
        self.feeds.flush();
        self.reports.flush();
        self.reporters.flush();
        self.seen_images.flush();
        self.seen_responses.flush();
        let used = env::storage_usage().saturating_sub(before);
        let cost = env::storage_byte_cost().saturating_mul(used as u128);
        let attached = env::attached_deposit();
        require!(attached >= cost, format!("attach at least {} yoctoNEAR to cover {} bytes of storage", cost.as_yoctonear(), used));
        let refund = attached.saturating_sub(cost);
        if refund > NearToken::from_yoctonear(0) {
            Promise::new(payer.clone()).transfer(refund).detach();
        }
    }
}

#[cfg(test)]
mod tests;
