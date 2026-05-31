// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title IActivation
/// @notice Minimal view interface the Marketplace uses to check whether a
///         license is bound to a device (active) before allowing a listing.
interface IActivation {
    function isActive(address owner, uint256 tokenId) external view returns (bool);
}
