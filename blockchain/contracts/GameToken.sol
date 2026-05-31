// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title GameToken
/// @notice ERC-1155 license token. Each tokenId is one game title; owning a
///         unit grants a license. Minting is gated to MINTER_ROLE (GameStore).
/// @dev Royalty (ERC-2981) and metadata URI are recorded once per game at
///      createGame() and are immutable thereafter (see ADR-0001).
contract GameToken is ERC1155, ERC2981, AccessControl {
    /// @notice Role held only by GameStore; authorizes minting license units.
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @dev Per-game IPFS metadata URI, set once at createGame() and immutable.
    mapping(uint256 => string) private _tokenURI;

    constructor() ERC1155("") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /// @notice Record a new game's vendor, royalty, and metadata URI. Minter only.
    /// @param tokenId Game title identifier.
    /// @param vendor Royalty receiver (the publishing vendor).
    /// @param royaltyBps Royalty in basis points (<= 10000), enforced by ERC-2981.
    /// @param uri_ IPFS metadata URI, immutable once set.
    function createGame(
        uint256 tokenId,
        address vendor,
        uint96 royaltyBps,
        string calldata uri_
    ) external onlyRole(MINTER_ROLE) {
        require(bytes(_tokenURI[tokenId]).length == 0, "GameToken: game exists");
        require(royaltyBps <= 10_000, "GameToken: royalty too high");
        _setTokenRoyalty(tokenId, vendor, royaltyBps);
        _tokenURI[tokenId] = uri_;
    }

    /// @notice Metadata URI for a game. Overrides the shared ERC-1155 URI with
    ///         the per-token IPFS CID recorded at creation.
    function uri(uint256 tokenId) public view override returns (string memory) {
        return _tokenURI[tokenId];
    }

    /// @notice Mint one license unit of `tokenId` to `to`. Minter only.
    /// @param to Recipient of the license.
    /// @param tokenId Game title identifier.
    function mint(address to, uint256 tokenId) external onlyRole(MINTER_ROLE) {
        _mint(to, tokenId, 1, "");
    }

    /// @dev Resolve the AccessControl/ERC1155 supportsInterface diamond.
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, ERC2981, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
