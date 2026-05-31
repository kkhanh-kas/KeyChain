// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title KeyCoin (KEY)
/// @notice ERC-20 internal payment token. Users buy KEY with ETH, then spend
///         KEY to purchase licenses. KEY is minted permissionlessly against ETH.
contract KeyCoin is ERC20, AccessControl {
    /// @notice KEY (18-decimal units) minted per 1 wei of ETH sent.
    uint256 public rate;

    /// @param initialRate KEY minted per wei of ETH.
    constructor(uint256 initialRate) ERC20("KeyCoin", "KEY") {
        rate = initialRate;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /// @notice Update the ETH→KEY exchange rate. Admin only.
    /// @param newRate KEY minted per wei of ETH going forward.
    function setRate(uint256 newRate) external onlyRole(DEFAULT_ADMIN_ROLE) {
        rate = newRate;
    }

    /// @notice Withdraw the ETH paid in via buyKeyCoin() to the admin. Admin only.
    function withdraw() external onlyRole(DEFAULT_ADMIN_ROLE) {
        (bool ok, ) = msg.sender.call{value: address(this).balance}("");
        require(ok, "KeyCoin: withdraw failed");
    }

    /// @notice Mint KEY to the caller in exchange for ETH at the current rate.
    /// @dev No role required — minting is permissionless against ETH value.
    function buyKeyCoin() external payable {
        require(msg.value > 0, "KeyCoin: no ETH sent");
        _mint(msg.sender, msg.value * rate);
    }
}
