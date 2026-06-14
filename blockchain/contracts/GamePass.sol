// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {GameStore} from "./GameStore.sol";

/// @title GamePass
/// @notice Fixed-duration subscription licenses. A single subscribe(gameId,
///         months) handles first-time, early renewal, and lapsed renewal.
/// @dev [De Alwis et al., 2023] - subscription model. See ADR-0002 for why
///      there is no separate renew() function.
contract GamePass {
    using SafeERC20 for IERC20;

    /// @notice Fixed subscription period unit.
    uint256 public constant MONTH = 30 days;

    /// @notice Subscription config for a game, keyed by gameId.
    struct PassInfo {
        uint256 monthlyPrice;
        address vendorAddress;
    }

    /// @notice Emitted on every subscription/renewal.
    event PassSubscribed(
        uint256 indexed gameId,
        address indexed subscriber,
        uint256 months,
        uint256 newExpiry
    );

    IERC20 public immutable keyCoin;
    GameStore public immutable gameStore;

    mapping(uint256 => PassInfo) private _passes;
    mapping(address => mapping(uint256 => uint256)) private _expiry;

    constructor(address keyCoin_, address gameStore_) {
        keyCoin = IERC20(keyCoin_);
        gameStore = GameStore(gameStore_);
    }

    /// @notice Configure the monthly price of a game's pass. Game vendor only.
    /// @param gameId Game whose pass is being configured.
    /// @param monthlyPrice Price in KEY per 30-day month.
    function registerPass(uint256 gameId, uint256 monthlyPrice) external {
        require(
            msg.sender == gameStore.gameVendor(gameId),
            "GamePass: not game vendor"
        );
        _passes[gameId] = PassInfo({
            monthlyPrice: monthlyPrice,
            vendorAddress: msg.sender
        });
    }

    /// @notice Subscribe to or renew a game pass for `months` months.
    /// @param gameId Game to subscribe to.
    /// @param months Number of 30-day months (1..12).
    function subscribe(uint256 gameId, uint256 months) external {
        require(months >= 1 && months <= 12, "GamePass: months out of range");
        PassInfo memory pass = _passes[gameId];
        require(pass.vendorAddress != address(0), "GamePass: pass not registered");

        uint256 cost = pass.monthlyPrice * months;
        keyCoin.safeTransferFrom(msg.sender, pass.vendorAddress, cost);

        uint256 current = _expiry[msg.sender][gameId];
        uint256 base = current > block.timestamp ? current : block.timestamp;
        uint256 newExpiry = base + months * MONTH;
        _expiry[msg.sender][gameId] = newExpiry;

        emit PassSubscribed(gameId, msg.sender, months, newExpiry);
    }

    /// @notice The monthly price (in KEY) of a game's pass; 0 if not registered.
    function monthlyPrice(uint256 gameId) external view returns (uint256) {
        return _passes[gameId].monthlyPrice;
    }

    /// @notice The timestamp at which a subscriber's pass for a game expires.
    function expiryOf(address subscriber, uint256 gameId)
        external
        view
        returns (uint256)
    {
        return _expiry[subscriber][gameId];
    }
}
