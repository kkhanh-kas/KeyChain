// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {GameToken} from "./GameToken.sol";

/// @title GameStore
/// @notice Game catalog and primary market. Vendors register games; customers
///         purchase licenses with KEY, which mints a GameToken to the buyer.
/// @dev [Cruz et al., 2018] - on-chain RBAC via onlyRole for vendor actions.
contract GameStore is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Role authorizing a publisher to register and manage games.
    bytes32 public constant VENDOR_ROLE = keccak256("VENDOR_ROLE");

    /// @notice Emitted when a customer buys a license on the primary market.
    event LicensePurchased(
        uint256 indexed gameId,
        address indexed buyer,
        address indexed vendor,
        uint256 price
    );

    /// @notice On-chain display data for a game, keyed by gameId.
    struct GameInfo {
        string name;
        uint256 price;
        bool isListed;
        address vendorAddress;
    }

    IERC20 public immutable keyCoin;
    GameToken public immutable gameToken;

    uint256 private _nextGameId = 1;
    mapping(uint256 => GameInfo) private _games;

    constructor(address keyCoin_, address gameToken_) {
        keyCoin = IERC20(keyCoin_);
        gameToken = GameToken(gameToken_);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /// @notice Register a new game. Vendor only.
    /// @param name Display name.
    /// @param price Price in KEY.
    /// @param royaltyBps Secondary-market royalty in basis points (<= 10000).
    /// @param uri_ IPFS metadata URI (immutable once set).
    /// @return gameId The new game's id.
    function registerGame(
        string calldata name,
        uint256 price,
        uint96 royaltyBps,
        string calldata uri_
    ) external onlyRole(VENDOR_ROLE) returns (uint256 gameId) {
        gameId = _nextGameId++;
        _games[gameId] = GameInfo({
            name: name,
            price: price,
            isListed: true,
            vendorAddress: msg.sender
        });
        gameToken.createGame(gameId, msg.sender, royaltyBps, uri_);
    }

    /// @notice Buy a license on the primary market. Transfers KEY from the
    ///         buyer to the vendor and mints the GameToken to the buyer.
    /// @param gameId Game to purchase.
    /// @dev Checks-Effects-Interactions + ReentrancyGuard on the external calls.
    function purchaseLicense(uint256 gameId) external nonReentrant {
        GameInfo memory game = _games[gameId];
        require(game.isListed, "GameStore: not listed");

        keyCoin.safeTransferFrom(msg.sender, game.vendorAddress, game.price);
        gameToken.mint(msg.sender, gameId);

        emit LicensePurchased(gameId, msg.sender, game.vendorAddress, game.price);
    }

    /// @notice Pause or resume new sales of a game. Callable by the owning
    ///         vendor (their own game) or the admin (any game, takedown).
    /// @dev Gates new purchases only; already-minted licenses are unaffected.
    function setGameListed(uint256 gameId, bool listed) external {
        require(
            msg.sender == _games[gameId].vendorAddress ||
                hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "GameStore: not authorized"
        );
        _games[gameId].isListed = listed;
    }

    /// @notice The vendor that registered a given game.
    function gameVendor(uint256 gameId) external view returns (address) {
        return _games[gameId].vendorAddress;
    }

    /// @notice Return every game's id alongside its info for catalog display.
    function getCatalog()
        external
        view
        returns (uint256[] memory ids, GameInfo[] memory infos)
    {
        uint256 count = _nextGameId - 1;
        ids = new uint256[](count);
        infos = new GameInfo[](count);
        for (uint256 i = 0; i < count; i++) {
            uint256 id = i + 1;
            ids[i] = id;
            infos[i] = _games[id];
        }
    }
}
