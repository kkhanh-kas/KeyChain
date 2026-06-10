import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

import type { ActivationContract, GameToken } from "../typechain-types";

// ActivationContract — binds a license to a device via machineHash.
// Once activated, a license cannot be resold until deactivated; activation
// state is scoped per (owner, tokenId) pair.
describe("ActivationContract", () => {
  async function deployActivationFixture() {
    const [deployer, vendor, player, otherPlayer] = await ethers.getSigners();

    const GameTokenFactory = await ethers.getContractFactory("GameToken");
    const gameToken = (await GameTokenFactory.connect(
      deployer
    ).deploy()) as unknown as GameToken;
    await gameToken.waitForDeployment();

    const ActivationFactory = await ethers.getContractFactory("ActivationContract");
    const activation = (await ActivationFactory.connect(deployer).deploy(
      await gameToken.getAddress()
    )) as unknown as ActivationContract;
    await activation.waitForDeployment();

    // Grant MINTER_ROLE to deployer so the fixture can mint directly.
    // In production GameStore holds MINTER_ROLE.
    const MINTER_ROLE = await gameToken.MINTER_ROLE();
    await gameToken.connect(deployer).grantRole(MINTER_ROLE, deployer.address);

    // Create a game and give the player one license unit to activate.
    const TOKEN_ID = 1n;
    await gameToken
      .connect(deployer)
      .createGame(TOKEN_ID, vendor.address, 500n, "ipfs://game-metadata-cid");
    await gameToken.connect(deployer).mint(player.address, TOKEN_ID);

    // Machine hashes standing in for two distinct devices.
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

  describe("deployment", () => {
    it("stores the GameToken address it was constructed with", async () => {
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

      expect(await activation.isActive(player.address, TOKEN_ID)).to.equal(false);
    });

    it("returns a zeroed license struct before activation", async () => {
      const { activation, player, TOKEN_ID } = await loadFixture(
        deployActivationFixture
      );

      const info = await activation.getLicense(player.address, TOKEN_ID);

      expect(info.isActive).to.equal(false);
      expect(info.hardwareHash).to.equal(ethers.ZeroHash);
      expect(info.activatedAt).to.equal(0n);
    });
  });

  describe("activateLicense", () => {
    it("succeeds when the caller owns the ERC-1155 license", async () => {
      const { activation, player, TOKEN_ID, MACHINE_HASH_1 } = await loadFixture(
        deployActivationFixture
      );

      await expect(
        activation.connect(player).activateLicense(TOKEN_ID, MACHINE_HASH_1)
      ).to.not.be.reverted;
    });

    it("marks the license active after activation", async () => {
      const { activation, player, TOKEN_ID, MACHINE_HASH_1 } = await loadFixture(
        deployActivationFixture
      );

      await activation.connect(player).activateLicense(TOKEN_ID, MACHINE_HASH_1);

      expect(await activation.isActive(player.address, TOKEN_ID)).to.equal(true);
    });

    it("records hardwareHash and a fresh activatedAt timestamp", async () => {
      const { activation, player, TOKEN_ID, MACHINE_HASH_1 } = await loadFixture(
        deployActivationFixture
      );

      const txTimestamp = await time.latest();

      await activation.connect(player).activateLicense(TOKEN_ID, MACHINE_HASH_1);

      const info = await activation.getLicense(player.address, TOKEN_ID);

      expect(info.isActive).to.equal(true);
      expect(info.hardwareHash).to.equal(MACHINE_HASH_1);
      expect(info.activatedAt).to.be.greaterThan(BigInt(txTimestamp));
    });

    it("stores the exact machineHash passed by the caller", async () => {
      const { activation, player, TOKEN_ID, MACHINE_HASH_2 } = await loadFixture(
        deployActivationFixture
      );

      await activation.connect(player).activateLicense(TOKEN_ID, MACHINE_HASH_2);

      const info = await activation.getLicense(player.address, TOKEN_ID);

      expect(info.hardwareHash).to.equal(MACHINE_HASH_2);
    });

    it("reverts when the caller does not own the license", async () => {
      const { activation, otherPlayer, TOKEN_ID, MACHINE_HASH_1 } =
        await loadFixture(deployActivationFixture);

      await expect(
        activation.connect(otherPlayer).activateLicense(TOKEN_ID, MACHINE_HASH_1)
      ).to.be.revertedWith("Activation: not license owner");
    });

    it("reverts when the license is already active", async () => {
      const { activation, player, TOKEN_ID, MACHINE_HASH_1, MACHINE_HASH_2 } =
        await loadFixture(deployActivationFixture);

      await activation.connect(player).activateLicense(TOKEN_ID, MACHINE_HASH_1);

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

      // Give a second owner the same title; activating one must not touch the other.
      await gameToken.connect(deployer).mint(otherPlayer.address, TOKEN_ID);

      await activation.connect(player).activateLicense(TOKEN_ID, MACHINE_HASH_1);

      expect(await activation.isActive(player.address, TOKEN_ID)).to.equal(true);
      expect(await activation.isActive(otherPlayer.address, TOKEN_ID)).to.equal(
        false
      );
    });
  });

  describe("deactivateLicense", () => {
    it("succeeds when the caller has an active license", async () => {
      const { activation, player, TOKEN_ID, MACHINE_HASH_1 } = await loadFixture(
        deployActivationFixture
      );

      await activation.connect(player).activateLicense(TOKEN_ID, MACHINE_HASH_1);

      await expect(activation.connect(player).deactivateLicense(TOKEN_ID)).to.not
        .be.reverted;
    });

    it("marks the license inactive so it can be resold again", async () => {
      const { activation, player, TOKEN_ID, MACHINE_HASH_1 } = await loadFixture(
        deployActivationFixture
      );

      await activation.connect(player).activateLicense(TOKEN_ID, MACHINE_HASH_1);

      await activation.connect(player).deactivateLicense(TOKEN_ID);

      expect(await activation.isActive(player.address, TOKEN_ID)).to.equal(false);
    });

    it("reverts when the license is not active", async () => {
      const { activation, player, TOKEN_ID } = await loadFixture(
        deployActivationFixture
      );

      await expect(
        activation.connect(player).deactivateLicense(TOKEN_ID)
      ).to.be.revertedWith("Activation: not active");
    });

    it("reverts on double deactivation", async () => {
      const { activation, player, TOKEN_ID, MACHINE_HASH_1 } = await loadFixture(
        deployActivationFixture
      );

      await activation.connect(player).activateLicense(TOKEN_ID, MACHINE_HASH_1);
      await activation.connect(player).deactivateLicense(TOKEN_ID);

      await expect(
        activation.connect(player).deactivateLicense(TOKEN_ID)
      ).to.be.revertedWith("Activation: not active");
    });

    it("allows reactivation with a different machineHash after deactivation", async () => {
      const { activation, player, TOKEN_ID, MACHINE_HASH_1, MACHINE_HASH_2 } =
        await loadFixture(deployActivationFixture);

      await activation.connect(player).activateLicense(TOKEN_ID, MACHINE_HASH_1);
      await activation.connect(player).deactivateLicense(TOKEN_ID);
      await activation.connect(player).activateLicense(TOKEN_ID, MACHINE_HASH_2);

      const info = await activation.getLicense(player.address, TOKEN_ID);

      expect(info.isActive).to.equal(true);
      expect(info.hardwareHash).to.equal(MACHINE_HASH_2);
    });
  });

  describe("ownership verification", () => {
    it("rejects activation from an address without the license", async () => {
      const { activation, otherPlayer, TOKEN_ID, MACHINE_HASH_1 } =
        await loadFixture(deployActivationFixture);

      await expect(
        activation.connect(otherPlayer).activateLicense(TOKEN_ID, MACHINE_HASH_1)
      ).to.be.revertedWith("Activation: not license owner");
    });

    it("does not let another address deactivate the player's record", async () => {
      const { activation, player, otherPlayer, TOKEN_ID, MACHINE_HASH_1 } =
        await loadFixture(deployActivationFixture);

      await activation.connect(player).activateLicense(TOKEN_ID, MACHINE_HASH_1);

      // otherPlayer has no active record of their own, so deactivate reverts.
      await expect(
        activation.connect(otherPlayer).deactivateLicense(TOKEN_ID)
      ).to.be.revertedWith("Activation: not active");
    });

    it("keeps state independent per (owner, tokenId) pair", async () => {
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

      await activation.connect(player).activateLicense(TOKEN_ID, MACHINE_HASH_1);
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

    it("keeps state independent across different tokenIds", async () => {
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

      await activation.connect(player).activateLicense(TOKEN_ID, MACHINE_HASH_1);

      expect(await activation.isActive(player.address, TOKEN_ID)).to.equal(true);
      expect(await activation.isActive(player.address, TOKEN_ID_2)).to.equal(
        false
      );

      await activation
        .connect(player)
        .activateLicense(TOKEN_ID_2, MACHINE_HASH_2);

      expect(await activation.isActive(player.address, TOKEN_ID_2)).to.equal(
        true
      );
    });
  });

  describe("state-machine transitions", () => {
    it("runs the full lifecycle: Inactive → Active → Inactive → Active", async () => {
      const { activation, player, TOKEN_ID, MACHINE_HASH_1, MACHINE_HASH_2 } =
        await loadFixture(deployActivationFixture);

      // Owned but inactive.
      expect(await activation.isActive(player.address, TOKEN_ID)).to.equal(false);

      // Activate on the first machine.
      await activation.connect(player).activateLicense(TOKEN_ID, MACHINE_HASH_1);
      expect(await activation.isActive(player.address, TOKEN_ID)).to.equal(true);

      let info = await activation.getLicense(player.address, TOKEN_ID);
      expect(info.isActive).to.equal(true);
      expect(info.hardwareHash).to.equal(MACHINE_HASH_1);
      expect(info.activatedAt).to.be.greaterThan(0n);

      // Deactivate.
      await activation.connect(player).deactivateLicense(TOKEN_ID);
      expect(await activation.isActive(player.address, TOKEN_ID)).to.equal(false);

      info = await activation.getLicense(player.address, TOKEN_ID);
      expect(info.isActive).to.equal(false);

      // Reactivate on another machine.
      await activation.connect(player).activateLicense(TOKEN_ID, MACHINE_HASH_2);
      expect(await activation.isActive(player.address, TOKEN_ID)).to.equal(true);

      info = await activation.getLicense(player.address, TOKEN_ID);
      expect(info.isActive).to.equal(true);
      expect(info.hardwareHash).to.equal(MACHINE_HASH_2);
    });

    it("requires deactivation before activating again", async () => {
      const { activation, player, TOKEN_ID, MACHINE_HASH_1, MACHINE_HASH_2 } =
        await loadFixture(deployActivationFixture);

      await activation.connect(player).activateLicense(TOKEN_ID, MACHINE_HASH_1);

      await expect(
        activation.connect(player).activateLicense(TOKEN_ID, MACHINE_HASH_2)
      ).to.be.revertedWith("Activation: already active");
    });

    it("does not allow deactivation twice", async () => {
      const { activation, player, TOKEN_ID, MACHINE_HASH_1 } = await loadFixture(
        deployActivationFixture
      );

      await activation.connect(player).activateLicense(TOKEN_ID, MACHINE_HASH_1);
      await activation.connect(player).deactivateLicense(TOKEN_ID);

      await expect(
        activation.connect(player).deactivateLicense(TOKEN_ID)
      ).to.be.revertedWith("Activation: not active");
    });

    it("advances activatedAt on each new activation", async () => {
      const { activation, player, TOKEN_ID, MACHINE_HASH_1, MACHINE_HASH_2 } =
        await loadFixture(deployActivationFixture);

      await activation.connect(player).activateLicense(TOKEN_ID, MACHINE_HASH_1);
      const firstActivatedAt = (
        await activation.getLicense(player.address, TOKEN_ID)
      ).activatedAt;

      await activation.connect(player).deactivateLicense(TOKEN_ID);
      await time.increase(60);
      await activation.connect(player).activateLicense(TOKEN_ID, MACHINE_HASH_2);

      const secondActivatedAt = (
        await activation.getLicense(player.address, TOKEN_ID)
      ).activatedAt;

      expect(secondActivatedAt).to.be.greaterThan(firstActivatedAt);
    });
  });
});
