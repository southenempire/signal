use anchor_lang::prelude::*;

use crate::{
    state::{within_bps, Config, PeerLink, Report, ReportStatus},
    SignalError, ANCHOR_DISCRIMINATOR, CONFIG_SEED, PEER_SEED,
};

/// Permissionless crank: compare two reports on the same feed from different reporters.
/// Agreement counts as a confirmation on every pending side; disagreement as a contradiction.
/// The PeerLink PDA makes each pair count once, so nobody can farm confirmations.
#[derive(Accounts)]
pub struct PeerCheck<'info> {
    #[account(mut)]
    pub cranker: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub report_a: Account<'info, Report>,
    #[account(mut)]
    pub report_b: Account<'info, Report>,
    #[account(
        init,
        payer = cranker,
        seeds = [PEER_SEED, report_a.key().as_ref(), report_b.key().as_ref()],
        bump,
        space = ANCHOR_DISCRIMINATOR + PeerLink::INIT_SPACE,
    )]
    pub peer_link: Account<'info, PeerLink>,
    pub system_program: Program<'info, System>,
}

impl<'info> PeerCheck<'info> {
    pub fn peer_check(&mut self, bumps: &PeerCheckBumps) -> Result<()> {
        // Canonical order, so (a, b) and (b, a) map to the same PeerLink.
        require!(self.report_a.key() < self.report_b.key(), SignalError::ReportsOutOfOrder);
        require!(self.report_a.feed == self.report_b.feed, SignalError::FeedMismatch);
        require!(self.report_a.reporter != self.report_b.reporter, SignalError::SameReporter);

        let a_pending = self.report_a.status == ReportStatus::Pending;
        let b_pending = self.report_b.status == ReportStatus::Pending;
        require!(a_pending || b_pending, SignalError::NothingPending);

        // A settled report may only vouch for a pending one if it was accepted.
        if !a_pending {
            require!(self.report_a.status == ReportStatus::Accepted, SignalError::AlreadySettled);
        }
        if !b_pending {
            require!(self.report_b.status == ReportStatus::Accepted, SignalError::AlreadySettled);
        }

        let gap = self
            .report_a
            .submitted_at
            .checked_sub(self.report_b.submitted_at)
            .ok_or(SignalError::Overflow)?
            .checked_abs()
            .ok_or(SignalError::Overflow)?;
        require!(gap <= self.config.peer_window_secs, SignalError::OutsidePeerWindow);

        // Symmetric check: each price within tolerance of the other.
        let tol = self.config.peer_tolerance_bps;
        let agree = within_bps(self.report_a.price, self.report_b.price, tol)
            && within_bps(self.report_b.price, self.report_a.price, tol);

        for (report, pending) in [(&mut self.report_a, a_pending), (&mut self.report_b, b_pending)] {
            if !pending {
                continue;
            }
            if agree {
                report.confirmations = report.confirmations.saturating_add(1);
            } else {
                report.contradictions = report.contradictions.saturating_add(1);
            }
        }

        self.peer_link.bump = bumps.peer_link;

        emit!(PeerChecked {
            report_a: self.report_a.key(),
            report_b: self.report_b.key(),
            agree,
        });
        Ok(())
    }
}

#[event]
pub struct PeerChecked {
    pub report_a: Pubkey,
    pub report_b: Pubkey,
    pub agree: bool,
}
