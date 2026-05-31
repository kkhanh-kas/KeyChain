// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {IERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import {IERC2981} from "@openzeppelin/contracts/interfaces/IERC2981.sol";
import {IActivation} from "./IActivation.sol";

/// @title Marketplace
/// @notice Secondary market for licenses. A license must be inactive to list;
///         listing escrows the unit. Buying splits payment royalty→vendor
///         (ERC-2981), remainder→seller, and transfers the license to the buyer.
/// @dev [Madine et al., 2023] - royalty distribution via marketplace.
contract Marketplace is ReentrancyGuard, IERC1155Receiver {
    using SafeERC20 for IERC20;

    /// @notice A license offered for resale, keyed by listingId.
    struct Listing {
        uint256 tokenId;
        address seller;
        uint256 price;
        bool isOpen;
    }

    /// @notice Emitted when a sale routes royalty to the game's vendor.
    event RoyaltyPaid(uint256 indexed tokenId, address indexed vendor, uint256 amount);

    IERC20 public immutable keyCoin;
    IERC1155 public immutable gameToken;
    IActivation public immutable activation;

    uint256 private _nextListingId = 1;
    mapping(uint256 => Listing) private _listings;

    constructor(address keyCoin_, address gameToken_, address activation_) {
        keyCoin = IERC20(keyCoin_);
        gameToken = IERC1155(gameToken_);
        activation = IActivation(activation_);
    }

    /// @notice List an inactive license for resale, escrowing the unit.
    /// @param tokenId Game license to sell.
    /// @param price Asking price in KEY.
    /// @return listingId The new listing's id.
    function listLicense(uint256 tokenId, uint256 price)
        external
        nonReentrant
        returns (uint256 listingId)
    {
        require(
            !activation.isActive(msg.sender, tokenId),
            "Marketplace: license active"
        );
        listingId = _nextListingId++;
        _listings[listingId] = Listing({
            tokenId: tokenId,
            seller: msg.sender,
            price: price,
            isOpen: true
        });
        gameToken.safeTransferFrom(msg.sender, address(this), tokenId, 1, "");
    }

    /// @notice Buy a listed license. Splits payment royalty→vendor (ERC-2981)
    ///         and remainder→seller, then transfers the license to the buyer.
    /// @param listingId Listing to purchase.
    /// @dev Checks-Effects-Interactions + ReentrancyGuard: the listing is closed
    ///      before any external token transfer.
    function buyLicense(uint256 listingId) external nonReentrant {
        Listing storage listing = _listings[listingId];
        require(listing.isOpen, "Marketplace: not open");

        listing.isOpen = false;

        (address vendor, uint256 royalty) = IERC2981(address(gameToken))
            .royaltyInfo(listing.tokenId, listing.price);

        keyCoin.safeTransferFrom(msg.sender, vendor, royalty);
        keyCoin.safeTransferFrom(msg.sender, listing.seller, listing.price - royalty);
        gameToken.safeTransferFrom(address(this), msg.sender, listing.tokenId, 1, "");

        emit RoyaltyPaid(listing.tokenId, vendor, royalty);
    }

    /// @notice Cancel an open listing and return the escrowed unit to the
    ///         seller. Seller only, while the listing is open.
    /// @param listingId Listing to cancel.
    function cancelListing(uint256 listingId) external nonReentrant {
        Listing storage listing = _listings[listingId];
        require(listing.isOpen, "Marketplace: not open");
        require(listing.seller == msg.sender, "Marketplace: not seller");

        listing.isOpen = false;
        gameToken.safeTransferFrom(address(this), msg.sender, listing.tokenId, 1, "");
    }

    /// @notice Read a listing by id.
    function getListing(uint256 listingId) external view returns (Listing memory) {
        return _listings[listingId];
    }

    // ── ERC-1155 receiver hooks (required to hold escrowed units) ──

    function onERC1155Received(address, address, uint256, uint256, bytes calldata)
        external
        pure
        returns (bytes4)
    {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external pure returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == type(IERC1155Receiver).interfaceId ||
            interfaceId == 0x01ffc9a7; // ERC-165
    }
}
