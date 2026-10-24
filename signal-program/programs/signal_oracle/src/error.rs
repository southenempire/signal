use anchor_lang::error_code;

#[error_code]
pub enum SignalError {
    #[msg("A tolerance is above 100% or a parameter is zero")]
    InvalidParams,
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    #[msg("Price must be greater than zero")]
    InvalidPrice,
    #[msg("Reporter reputation is below the network minimum")]
    ReporterBanned,
    #[msg("The reward pool has no unlocked funds for this report")]
    PoolExhausted,
    #[msg("Both reports must be on the same feed")]
    FeedMismatch,
    #[msg("A reporter cannot confirm their own report")]
    SameReporter,
    #[msg("Reports are too far apart in time to count as peers")]
    OutsidePeerWindow,
    #[msg("Pass the two reports in address order: report_a < report_b")]
    ReportsOutOfOrder,
    #[msg("Neither report is pending")]
    NothingPending,
    #[msg("The report has already been settled")]
    AlreadySettled,
    #[msg("Not enough evidence yet and the pending timeout has not passed")]
    StillPending,
    #[msg("The account passed does not match the report")]
    AccountMismatch,
    #[msg("Arithmetic overflow")]
    Overflow,
}
