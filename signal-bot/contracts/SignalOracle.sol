// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SignalOracle
 * @notice Decentralized Physical Truth Price Oracle on BOTChain (Chain ID 677)
 *
 * Flow: the Signal consensus engine checks every submission against local price
 * bounds and peer reports. Accepted observations are recorded here and roll up
 * into per-region price feeds; rejected ones are slashed and hit the reporter's
 * on-chain reputation.
 *
 * Reporters are identified by a salted hash (reporterId) so Telegram identities
 * are never published; `wallet` is the reporter's EVM address if they linked one.
 */
contract SignalOracle {
    address public owner;

    struct PriceReport {
        bytes32 feedId;       // keccak256(category:region:item)
        uint256 usdcPrice;    // USD price in cents
        uint256 timestamp;
        string imageHash;     // sha256 of the original photo
        bytes32 reporterId;
        address wallet;
    }

    struct Feed {
        string key;           // human-readable "CATEGORY:region:item"
        uint256 medianPrice;  // USD cents, median of accepted observations
        uint256 samples;      // observations behind the median
        uint256 updatedAt;
    }

    PriceReport[] public reports;
    mapping(bytes32 => Feed) public feeds;
    bytes32[] public feedIds;

    // Reputation 0–100. Reporters start at INITIAL_REPUTATION once first seen.
    uint8 public constant INITIAL_REPUTATION = 50;
    mapping(bytes32 => uint8) public reputation;
    mapping(bytes32 => bool) public knownReporter;
    mapping(bytes32 => uint256) public slashCount;

    event PriceReported(uint256 indexed reportId, bytes32 indexed feedId, uint256 usdcPrice, bytes32 indexed reporterId);
    event FeedUpdated(bytes32 indexed feedId, string key, uint256 medianPrice, uint256 samples);
    event ReporterSlashed(bytes32 indexed reporterId, string imageHash, string reason, uint8 newReputation);
    event ReputationUpdated(bytes32 indexed reporterId, uint8 newReputation);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        owner = newOwner;
    }

    /// Records one consensus-accepted observation and refreshes its feed.
    function recordPrice(
        string calldata feedKey,
        uint256 usdcPrice,
        string calldata imageHash,
        bytes32 reporterId,
        address wallet,
        uint256 feedMedian,
        uint256 feedSamples,
        uint8 newReputation
    ) external onlyOwner returns (uint256) {
        bytes32 feedId = keccak256(bytes(feedKey));

        reports.push(PriceReport({
            feedId: feedId,
            usdcPrice: usdcPrice,
            timestamp: block.timestamp,
            imageHash: imageHash,
            reporterId: reporterId,
            wallet: wallet
        }));
        uint256 reportId = reports.length - 1;
        emit PriceReported(reportId, feedId, usdcPrice, reporterId);

        _updateFeed(feedId, feedKey, feedMedian, feedSamples);
        _setReputation(reporterId, newReputation);
        return reportId;
    }

    /// Records a slash for a fake, out-of-bounds or duplicate submission.
    function slash(
        bytes32 reporterId,
        string calldata imageHash,
        string calldata reason,
        uint8 newReputation
    ) external onlyOwner {
        knownReporter[reporterId] = true;
        reputation[reporterId] = newReputation;
        slashCount[reporterId] += 1;
        emit ReporterSlashed(reporterId, imageHash, reason, newReputation);
    }

    function _updateFeed(bytes32 feedId, string calldata feedKey, uint256 median, uint256 samples) internal {
        Feed storage f = feeds[feedId];
        if (f.updatedAt == 0) {
            f.key = feedKey;
            feedIds.push(feedId);
        }
        f.medianPrice = median;
        f.samples = samples;
        f.updatedAt = block.timestamp;
        emit FeedUpdated(feedId, feedKey, median, samples);
    }

    function _setReputation(bytes32 reporterId, uint8 newReputation) internal {
        knownReporter[reporterId] = true;
        reputation[reporterId] = newReputation;
        emit ReputationUpdated(reporterId, newReputation);
    }

    // ─── Read API for prediction markets, insurance and index protocols ───────

    function getFeed(string calldata feedKey) external view returns (uint256 medianPrice, uint256 samples, uint256 updatedAt) {
        Feed storage f = feeds[keccak256(bytes(feedKey))];
        return (f.medianPrice, f.samples, f.updatedAt);
    }

    function getFeedCount() external view returns (uint256) {
        return feedIds.length;
    }

    function getReportCount() external view returns (uint256) {
        return reports.length;
    }

    function getReport(uint256 index) external view returns (
        bytes32 feedId,
        uint256 usdcPrice,
        uint256 timestamp,
        string memory imageHash,
        bytes32 reporterId,
        address wallet
    ) {
        require(index < reports.length, "Invalid index");
        PriceReport memory r = reports[index];
        return (r.feedId, r.usdcPrice, r.timestamp, r.imageHash, r.reporterId, r.wallet);
    }

    function getReputation(bytes32 reporterId) external view returns (uint8) {
        return knownReporter[reporterId] ? reputation[reporterId] : INITIAL_REPUTATION;
    }
}
