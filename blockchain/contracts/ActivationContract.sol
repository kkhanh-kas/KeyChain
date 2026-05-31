// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

/// @title ActivationContract
/// @notice Tracks on-chain activation state binding a license to a device via
///         machineHash. A license must be inactive to be resold.
/// @dev [De Alwis et al., 2023] - activation verification. Ethereum transaction
///      signing proves identity; no separate ECDSA signature is needed.
contract ActivationContract {
    /// @notice Activation state for a license, keyed by (owner, tokenId).
    struct LicenseInfo {
        bool isActive;
        bytes32 hardwareHash;
        uint256 activatedAt;
    }

    /// @notice The GameToken whose license ownership gates activation.
    IERC1155 public immutable gameToken;

    mapping(address => mapping(uint256 => LicenseInfo)) private _licenses;

    constructor(address gameToken_) {
        gameToken = IERC1155(gameToken_);
    }

    /// @notice Bind a held license to a device and mark it active.
    /// @param tokenId Game title the caller owns.
    /// @param machineHash Client-derived device hash, stored on-chain.
    function activateLicense(uint256 tokenId, bytes32 machineHash) external {
        require(
            gameToken.balanceOf(msg.sender, tokenId) > 0,
            "Activation: not license owner"
        );
        require(
            !_licenses[msg.sender][tokenId].isActive,
            "Activation: already active"
        );
        _licenses[msg.sender][tokenId] = LicenseInfo({
            isActive: true,
            hardwareHash: machineHash,
            activatedAt: block.timestamp
        });
    }

    /// @notice Release the device binding so the license can be resold.
    /// @param tokenId Game title to deactivate.
    function deactivateLicense(uint256 tokenId) external {
        require(
            _licenses[msg.sender][tokenId].isActive,
            "Activation: not active"
        );
        _licenses[msg.sender][tokenId].isActive = false;
    }

    /// @notice Whether a license is currently bound to a device (blocks resale).
    function isActive(address owner, uint256 tokenId) external view returns (bool) {
        return _licenses[owner][tokenId].isActive;
    }

    /// @notice Read the activation state for a given owner and game.
    function getLicense(address owner, uint256 tokenId)
        external
        view
        returns (LicenseInfo memory)
    {
        return _licenses[owner][tokenId];
    }
}
