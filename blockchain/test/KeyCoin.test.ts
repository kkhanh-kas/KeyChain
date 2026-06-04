import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("KeyCoin", function () {
  const INITIAL_RATE = 100n;
  const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;

  async function deployKeyCoinFixture() {
    const [admin, user1, user2] = await ethers.getSigners();
    const KeyCoin = await ethers.getContractFactory("KeyCoin");
    const keyCoin = await KeyCoin.deploy(INITIAL_RATE);
    return { keyCoin, admin, user1, user2 };
  }

  describe("Deployment", function () {
    it("Should set the right initial rate", async function () {
      const { keyCoin } = await loadFixture(deployKeyCoinFixture);
      expect(await keyCoin.rate()).to.equal(INITIAL_RATE);
    });

    it("Should grant DEFAULT_ADMIN_ROLE to deployer", async function () {
      const { keyCoin, admin } = await loadFixture(deployKeyCoinFixture);
      expect(await keyCoin.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
    });
  });

  describe("setRate", function () {
    it("Should allow admin to update the rate", async function () {
      const { keyCoin } = await loadFixture(deployKeyCoinFixture);
      const newRate = 200n;
      await keyCoin.setRate(newRate);
      expect(await keyCoin.rate()).to.equal(newRate);
    });

    // CASE MỚI: Check việc buy theo rate mới
    it("Should mint at the new rate after setRate", async function () {
      const { keyCoin, user1 } = await loadFixture(deployKeyCoinFixture);
      await keyCoin.setRate(200n);
      const ethAmount = ethers.parseEther("1");
      await keyCoin.connect(user1).buyKeyCoin({ value: ethAmount });
      expect(await keyCoin.balanceOf(user1.address)).to.equal(ethAmount * 200n);
    });

    it("Should revert if non-admin tries to update the rate", async function () {
      const { keyCoin, user1 } = await loadFixture(deployKeyCoinFixture);
      const newRate = 200n;
      await expect(keyCoin.connect(user1).setRate(newRate))
        .to.be.revertedWithCustomError(keyCoin, "AccessControlUnauthorizedAccount")
        .withArgs(user1.address, DEFAULT_ADMIN_ROLE);
    });
  });

  describe("buyKeyCoin", function () {
    it("Should mint correct amount of KEY based on ETH sent and current rate", async function () {
      const { keyCoin, user1 } = await loadFixture(deployKeyCoinFixture);
      const ethAmount = ethers.parseEther("1");
      await keyCoin.connect(user1).buyKeyCoin({ value: ethAmount });
      const expectedKey = ethAmount * INITIAL_RATE;
      expect(await keyCoin.balanceOf(user1.address)).to.equal(expectedKey);
    });

    it("Should revert if no ETH is sent", async function () {
      const { keyCoin, user1 } = await loadFixture(deployKeyCoinFixture);
      await expect(keyCoin.connect(user1).buyKeyCoin({ value: 0n }))
        .to.be.revertedWith("KeyCoin: no ETH sent");
    });
  });

  describe("withdraw", function () {
    it("Should allow admin to withdraw ETH from contract", async function () {
      const { keyCoin, admin, user1 } = await loadFixture(deployKeyCoinFixture);
      const ethAmount = ethers.parseEther("2");
      await keyCoin.connect(user1).buyKeyCoin({ value: ethAmount });
      const initialAdminBalance = await ethers.provider.getBalance(admin.address);
      const tx = await keyCoin.withdraw();
      const receipt = await tx.wait();
      const gasUsed = BigInt(receipt!.gasUsed) * BigInt(receipt!.gasPrice);
      const finalAdminBalance = await ethers.provider.getBalance(admin.address);
      expect(finalAdminBalance).to.equal(initialAdminBalance + ethAmount - gasUsed);
    });

    it("Should revert if non-admin tries to withdraw", async function () {
      const { keyCoin, user1 } = await loadFixture(deployKeyCoinFixture);
      await expect(keyCoin.connect(user1).withdraw())
        .to.be.revertedWithCustomError(keyCoin, "AccessControlUnauthorizedAccount")
        .withArgs(user1.address, DEFAULT_ADMIN_ROLE);
    });
  });
});