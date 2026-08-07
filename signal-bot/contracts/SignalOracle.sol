// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SignalOracle
 * @notice Decentralized Physical Truth Price Oracle on BOTChain (Chain ID 677)
 */
contract SignalOracle {
    address public owner;

    struct PriceReport {
        string category;      // e.g. "FUEL", "GROCERY"
        uint256 usdcPrice;    // e.g. 52 (0.52 USDC * 100)
        uint256 timestamp;
        string imageHash;
        address reporter;
    }

    PriceReport[] public reports;

    event PriceReported(
        uint256 indexed reportId,
        string category,
        uint256 usdcPrice,
        uint256 timestamp,
        address indexed reporter
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function recordPrice(
        string calldata category,
        uint256 usdcPrice,
        string calldata imageHash,
        address reporter
    ) external returns (uint256) {
        reports.push(PriceReport({
            category: category,
            usdcPrice: usdcPrice,
            timestamp: block.timestamp,
            imageHash: imageHash,
            reporter: reporter
        }));

        uint256 reportId = reports.length - 1;
        emit PriceReported(reportId, category, usdcPrice, block.timestamp, reporter);
        return reportId;
    }

    function getReportCount() external view returns (uint256) {
        return reports.length;
    }

    function getReport(uint256 index) external view returns (
        string memory category,
        uint256 usdcPrice,
        uint256 timestamp,
        string memory imageHash,
        address reporter
    ) {
        require(index < reports.length, "Invalid index");
        PriceReport memory r = reports[index];
        return (r.category, r.usdcPrice, r.timestamp, r.imageHash, r.reporter);
    }
}
