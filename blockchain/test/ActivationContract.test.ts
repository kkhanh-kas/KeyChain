import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

import type {
  ActivationContract,
  GameToken,
} from "../typechain-types";

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

async function deployActivationFixture() {
  const [deployer, vendor, player, otherPlayer] = await ethers.getSigners();

  // 1. Deploy GameToken
  const GameTokenFactory = await ethers.getContractFactory("GameToken");
  const gameToken = (await GameTokenFactory.connect(
    deployer
  ).deploy()) as unknown as GameToken;
  await gameToken.waitForDeployment();

  // 2. Deploy ActivationContract
  const ActivationFactory = await ethers.getContractFactory("ActivationContract");
  const activation = (await ActivationFactory.connect(deployer).deploy(
    await gameToken.getAddress()
  )) as unknown as ActivationContract;
  await activation.waitForDeployment();

  // 3. Grant MINTER_ROLE to deployer for isolated unit testing.
  //    In production, GameStore should hold MINTER_ROLE.
  const MINTER_ROLE = await gameToken.MINTER_ROLE();
  await gameToken.connect(deployer).grantRole(MINTER_ROLE, deployer.address);

  // 4. Create a game.
  const TOKEN_ID = 1n;
  await gameToken
    .connect(deployer)
    .createGame(TOKEN_ID, vendor.address, 500n, "ipfs://game-metadata-cid");

  // 5. Mint one license to player.
  await gameToken.connect(deployer).mint(player.address, TOKEN_ID);

  // Machine hashes used for activation tests.
  const MACHINE_HASH_1 = ethers.keccak256(
    ethers.toUtf8Bytes("machine-001")
  ) as `0x${string}`;

  const MACHINE_HASH_2 = ethers.keccak256(
    ethers.toUtf8Bytes("machine-002")
  ) as `0x${string}`;

  return {
    deployer,
    vendor,
    player,
    otherPlayer,
    gameToken,
    activation,
    TOKEN_ID,
    MACHINE_HASH_1,
    MACHINE_HASH_2,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ActivationContract", () => {
  // -------------------------------------------------------------------------
  // 1. Deployment
  // -------------------------------------------------------------------------
  describe("Deployment", () => {
    it("stores the correct GameToken address", async () => {
      const { activation, gameToken } = await loadFixture(
        deployActivationFixture
      );

      expect(await activation.gameToken()).to.equal(
        await gameToken.getAddress()
      );
    });

    it("defaults to inactive for any owner/tokenId pair", async () => {
      const { activation, player, TOKEN_ID } = await loadFixture(
        deployActivationFixture
      );

      expect(await activation.isActive(player.address, TOKEN_ID)).to.be.false;
    });

    it("getLicense returns a zeroed struct before activation", async () => {
      const { activation, player, TOKEN_ID } = await loadFixture(
        deployActivationFixture
      );

      const info = await activation.getLicense(player.address, TOKEN_ID);

      expect(info.isActive).to.be.false;
      expect(info.hardwareHash).to.equal(ethers.ZeroHash);
      expect(info.activatedAt).to.equal(0n);
    });
  });

  // -------------------------------------------------------------------------
  // 2. activateLicense()
  // -------------------------------------------------------------------------
  describe("activateLicense()", () => {
    it("succeeds when caller owns the ERC-1155 license", async () => {
      const { activation, player, TOKEN_ID, MACHINE_HASH_1 } =
        await loadFixture(deployActivationFixture);

      await expect(
        activation.connect(player).activateLicense(TOKEN_ID, MACHINE_HASH_1)
      ).to.not.be.reverted;
    });

    it("sets isActive to true after activation", async () => {
      const { activation, player, TOKEN_ID, MACHINE_HASH_1 } =
        await loadFixture(deployActivationFixture);

      await activation
        .connect(player)
        .activateLicense(TOKEN_ID, MACHINE_HASH_1);

      expect(await activation.isActive(player.address, TOKEN_ID)).to.be.true;
    });

    it("getLicense returns correct data after activation", async () => {
      const { activation, player, TOKEN_ID, MACHINE_HASH_1 } =
        await loadFixture(deployActivationFixture);

      const txTimestamp = await time.latest();

      await activation
        .connect(player)
        .activateLicense(TOKEN_ID, MACHINE_HASH_1);

      const info = await activation.getLicense(player.address, TOKEN_ID);

      expect(info.isActive).to.be.true;
      expect(info.hardwareHash).to.equal(MACHINE_HASH_1);
      expect(info.activatedAt).to.be.greaterThan(BigInt(txTimestamp));
    });

    it("stores the exact machineHash passed by the caller", async () => {
      const { activation, player, TOKEN_ID, MACHINE_HASH_2 } =
        await loadFixture(deployActivationFixture);

      await activation
        .connect(player)
        .activateLicense(TOKEN_ID, MACHINE_HASH_2);

      const info = await activation.getLicense(player.address, TOKEN_ID);

      expect(info.hardwareHash).to.equal(MACHINE_HASH_2);
    });

    it("reverts when caller does not own the license", async () => {
      const { activation, otherPlayer, TOKEN_ID, MACHINE_HASH_1 } =
        await loadFixture(deployActivationFixture);

      await expect(
        activation
          .connect(otherPlayer)
          .activateLicense(TOKEN_ID, MACHINE_HASH_1)
      ).to.be.revertedWith("Activation: not license owner");
    });

    it("reverts when the license is already active", async () => {
      const { activation, player, TOKEN_ID, MACHINE_HASH_1, MACHINE_HASH_2 } =
        await loadFixture(deployActivationFixture);

      await activation
        .connect(player)
        .activateLicense(TOKEN_ID, MACHINE_HASH_1);

      await expect(
        activation.connect(player).activateLicense(TOKEN_ID, MACHINE_HASH_2)
      ).to.be.revertedWith("Activation: already active");
    });

    it("keeps activation state scoped per owner", async () => {
      const {
        deployer,
        activation,
        gameToken,
        player,
        otherPlayer,
        TOKEN_ID,
        MACHINE_HASH_1,
      } = await loadFixture(deployActivationFixture);

      await gameToken.connect(deployer).mint(otherPlayer.address, TOKEN_ID);

      await activation
        .connect(player)
        .activateLicense(TOKEN_ID, MACHINE_HASH_1);

      expect(await activation.isActive(player.address, TOKEN_ID)).to.be.true;
      expect(await activation.isActive(otherPlayer.address, TOKEN_ID)).to.be
        .false;
    });
  });

  // -------------------------------------------------------------------------
  // 3. deactivateLicense()
  // -------------------------------------------------------------------------
  describe("deactivateLicense()", () => {
    it("succeeds when caller has an active license", async () => {
      const { activation, player, TOKEN_ID, MACHINE_HASH_1 } =
        await loadFixture(deployActivationFixture);

      await activation
        .connect(player)
        .activateLicense(TOKEN_ID, MACHINE_HASH_1);

      await expect(activation.connect(player).deactivateLicense(TOKEN_ID)).to
        .not.be.reverted;
    });

    it("sets isActive to false after deactivation", async () => {
      const { activation, player, TOKEN_ID, MACHINE_HASH_1 } =
        await loadFixture(deployActivationFixture);

      await activation
        .connect(player)
        .activateLicense(TOKEN_ID, MACHINE_HASH_1);

      await activation.connect(player).deactivateLicense(TOKEN_ID);

      expect(await activation.isActive(player.address, TOKEN_ID)).to.be.false;
    });

    it("reverts when the license is already inactive", async () => {
      const { activation, player, TOKEN_ID } = await loadFixture(
        deployActivationFixture
      );

      await expect(
        activation.connect(player).deactivateLicense(TOKEN_ID)
      ).to.be.revertedWith("Activation: not active");
    });

    it("reverts on double deactivation", async () => {
      const { activation, player, TOKEN_ID, MACHINE_HASH_1 } =
        await loadFixture(deployActivationFixture);

      await activation
        .connect(player)
        .activateLicense(TOKEN_ID, MACHINE_HASH_1);

      await activation.connect(player).deactivateLicense(TOKEN_ID);

      await expect(
        activation.connect(player).deactivateLicense(TOKEN_ID)
      ).to.be.revertedWith("Activation: not active");
    });

    it("allows reactivation with a different machineHash after deactivation", async () => {
      const { activation, player, TOKEN_ID, MACHINE_HASH_1, MACHINE_HASH_2 } =
        await loadFixture(deployActivationFixture);

      await activation
        .connect(player)
        .activateLicense(TOKEN_ID, MACHINE_HASH_1);

      await activation.connect(player).deactivateLicense(TOKEN_ID);

      await activation
        .connect(player)
        .activateLicense(TOKEN_ID, MACHINE_HASH_2);

      const info = await activation.getLicense(player.address, TOKEN_ID);

      expect(info.isActive).to.be.true;
      expect(info.hardwareHash).to.equal(MACHINE_HASH_2);
    });
  });

  // -------------------------------------------------------------------------
  // 4. Ownership verification
  // -------------------------------------------------------------------------
  describe("Ownership verification", () => {
    it("rejects activation from an address without the license", async () => {
      const { activation, otherPlayer, TOKEN_ID, MACHINE_HASH_1 } =
        await loadFixture(deployActivationFixture);

      await expect(
        activation
          .connect(otherPlayer)
          .activateLicense(TOKEN_ID, MACHINE_HASH_1)
      ).to.be.revertedWith("Activation: not license owner");
    });

    it("does not allow another address to deactivate player's activation record", async () => {
      const { activation, player, otherPlayer, TOKEN_ID, MACHINE_HASH_1 } =
        await loadFixture(deployActivationFixture);

      await activation
        .connect(player)
        .activateLicense(TOKEN_ID, MACHINE_HASH_1);

      await expect(
        activation.connect(otherPlayer).deactivateLicense(TOKEN_ID)
      ).to.be.revertedWith("Activation: not active");
    });

    it("keeps activation state independent per (owner, tokenId) pair", async () => {
      const {
        deployer,
        activation,
        gameToken,
        player,
        otherPlayer,
        TOKEN_ID,
        MACHINE_HASH_1,
        MACHINE_HASH_2,
      } = await loadFixture(deployActivationFixture);

      await gameToken.connect(deployer).mint(otherPlayer.address, TOKEN_ID);

      await activation
        .connect(player)
        .activateLicense(TOKEN_ID, MACHINE_HASH_1);

      await activation
        .connect(otherPlayer)
        .activateLicense(TOKEN_ID, MACHINE_HASH_2);

      const playerInfo = await activation.getLicense(player.address, TOKEN_ID);
      const otherInfo = await activation.getLicense(
        otherPlayer.address,
        TOKEN_ID
      );

      expect(playerInfo.hardwareHash).to.equal(MACHINE_HASH_1);
      expect(otherInfo.hardwareHash).to.equal(MACHINE_HASH_2);
    });

    it("keeps activation state independent across different tokenIds", async () => {
      const {
        deployer,
        activation,
        gameToken,
        vendor,
        player,
        TOKEN_ID,
        MACHINE_HASH_1,
        MACHINE_HASH_2,
      } = await loadFixture(deployActivationFixture);

      const TOKEN_ID_2 = 2n;

      await gameToken
        .connect(deployer)
        .createGame(TOKEN_ID_2, vendor.address, 300n, "ipfs://game2-cid");

      await gameToken.connect(deployer).mint(player.address, TOKEN_ID_2);

      await activation
        .connect(player)
        .activateLicense(TOKEN_ID, MACHINE_HASH_1);

      expect(await activation.isActive(player.address, TOKEN_ID)).to.be.true;
      expect(await activation.isActive(player.address, TOKEN_ID_2)).to.be.false;

      await activation
        .connect(player)
        .activateLicense(TOKEN_ID_2, MACHINE_HASH_2);

      expect(await activation.isActive(player.address, TOKEN_ID_2)).to.be.true;
    });
  });

  // -------------------------------------------------------------------------
  // 5. State-machine transitions
  // -------------------------------------------------------------------------
  describe("State-machine transitions", () => {
    it("runs full lifecycle: Inactive → Active → Inactive → Active", async () => {
      const { activation, player, TOKEN_ID, MACHINE_HASH_1, MACHINE_HASH_2 } =
        await loadFixture(deployActivationFixture);

      // Step 1: Owned but inactive.
      expect(await activation.isActive(player.address, TOKEN_ID)).to.be.false;

      // Step 2: Activate on the first machine.
      await activation
        .connect(player)
        .activateLicense(TOKEN_ID, MACHINE_HASH_1);

      expect(await activation.isActive(player.address, TOKEN_ID)).to.be.true;

      let info = await activation.getLicense(player.address, TOKEN_ID);
      expect(info.isActive).to.be.true;
      expect(info.hardwareHash).to.equal(MACHINE_HASH_1);
      expect(info.activatedAt).to.be.greaterThan(0n);

      // Step 3: Deactivate.
      await activation.connect(player).deactivateLicense(TOKEN_ID);

      expect(await activation.isActive(player.address, TOKEN_ID)).to.be.false;

      info = await activation.getLicense(player.address, TOKEN_ID);
      expect(info.isActive).to.be.false;

      // Step 4: Reactivate on another machine.
      await activation
        .connect(player)
        .activateLicense(TOKEN_ID, MACHINE_HASH_2);

      expect(await activation.isActive(player.address, TOKEN_ID)).to.be.true;

      info = await activation.getLicense(player.address, TOKEN_ID);
      expect(info.isActive).to.be.true;
      expect(info.hardwareHash).to.equal(MACHINE_HASH_2);
    });

    it("requires deactivation before activating again", async () => {
      const { activation, player, TOKEN_ID, MACHINE_HASH_1, MACHINE_HASH_2 } =
        await loadFixture(deployActivationFixture);

      await activation
        .connect(player)
        .activateLicense(TOKEN_ID, MACHINE_HASH_1);

      await expect(
        activation.connect(player).activateLicense(TOKEN_ID, MACHINE_HASH_2)
      ).to.be.revertedWith("Activation: already active");
    });

    it("does not allow deactivation twice", async () => {
      const { activation, player, TOKEN_ID, MACHINE_HASH_1 } =
        await loadFixture(deployActivationFixture);

      await activation
        .connect(player)
        .activateLicense(TOKEN_ID, MACHINE_HASH_1);

      await activation.connect(player).deactivateLicense(TOKEN_ID);

      await expect(
        activation.connect(player).deactivateLicense(TOKEN_ID)
      ).to.be.revertedWith("Activation: not active");
    });

    it("updates activatedAt on each new activation", async () => {
      const { activation, player, TOKEN_ID, MACHINE_HASH_1, MACHINE_HASH_2 } =
        await loadFixture(deployActivationFixture);

      await activation
        .connect(player)
        .activateLicense(TOKEN_ID, MACHINE_HASH_1);

      const firstInfo = await activation.getLicense(player.address, TOKEN_ID);
      const firstActivatedAt = firstInfo.activatedAt;

      await activation.connect(player).deactivateLicense(TOKEN_ID);

      await time.increase(60);

      await activation
        .connect(player)
        .activateLicense(TOKEN_ID, MACHINE_HASH_2);

      const secondInfo = await activation.getLicense(player.address, TOKEN_ID);

      expect(secondInfo.activatedAt).to.be.greaterThan(firstActivatedAt);
    });
  });
});