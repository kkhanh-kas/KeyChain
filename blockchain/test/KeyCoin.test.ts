import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

// KeyCoin — the platform's ERC-20 currency. Users mint KEY by sending ETH at
// the current rate (buyKeyCoin); the admin controls the rate and can withdraw
// the accumulated ETH.
describe("KeyCoin", () => {
  const INITIAL_RATE = 100n;
  const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;

  async function deployKeyCoinFixture() {
    const [admin, user1, user2] = await ethers.getSigners();
    const KeyCoin = await ethers.getContractFactory("KeyCoin");
    const keyCoin = await KeyCoin.deploy(INITIAL_RATE);
    return { keyCoin, admin, user1, user2 };
  }

  describe("deployment", () => {
    it("sets the initial rate from the constructor", async () => {
      const { keyCoin } = await loadFixture(deployKeyCoinFixture);
      expect(await keyCoin.rate()).to.equal(INITIAL_RATE);
    });

    it("grants DEFAULT_ADMIN_ROLE to the deployer", async () => {
      const { keyCoin, admin } = await loadFixture(deployKeyCoinFixture);
      expect(await keyCoin.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.equal(
        true
      );
    });
  });

  describe("setRate", () => {
    it("lets the admin update the rate", async () => {
      const { keyCoin } = await loadFixture(deployKeyCoinFixture);
      const newRate = 200n;
      await keyCoin.setRate(newRate);
      expect(await keyCoin.rate()).to.equal(newRate);
    });

    it("mints at the new rate on the next purchase", async () => {
      const { keyCoin, user1 } = await loadFixture(deployKeyCoinFixture);
      await keyCoin.setRate(200n);
      const ethAmount = ethers.parseEther("1");
      await keyCoin.connect(user1).buyKeyCoin({ value: ethAmount });
      expect(await keyCoin.balanceOf(user1.address)).to.equal(ethAmount * 200n);
    });

    it("reverts when a non-admin tries to update the rate", async () => {
      const { keyCoin, user1 } = await loadFixture(deployKeyCoinFixture);
      const newRate = 200n;
      await expect(keyCoin.connect(user1).setRate(newRate))
        .to.be.revertedWithCustomError(keyCoin, "AccessControlUnauthorizedAccount")
        .withArgs(user1.address, DEFAULT_ADMIN_ROLE);
    });
  });

  describe("buyKeyCoin", () => {
    it("mints KEY proportional to ETH sent at the current rate", async () => {
      const { keyCoin, user1 } = await loadFixture(deployKeyCoinFixture);
      const ethAmount = ethers.parseEther("1");
      await keyCoin.connect(user1).buyKeyCoin({ value: ethAmount });
      const expectedKey = ethAmount * INITIAL_RATE;
      expect(await keyCoin.balanceOf(user1.address)).to.equal(expectedKey);
    });

    it("reverts when no ETH is sent", async () => {
      const { keyCoin, user1 } = await loadFixture(deployKeyCoinFixture);
      await expect(
        keyCoin.connect(user1).buyKeyCoin({ value: 0n })
      ).to.be.revertedWith("KeyCoin: no ETH sent");
    });
  });

  describe("withdraw", () => {
    it("lets the admin withdraw the contract's ETH", async () => {
      const { keyCoin, admin, user1 } = await loadFixture(deployKeyCoinFixture);
      const ethAmount = ethers.parseEther("2");
      await keyCoin.connect(user1).buyKeyCoin({ value: ethAmount });

      const initialAdminBalance = await ethers.provider.getBalance(admin.address);
      const tx = await keyCoin.withdraw();
      const receipt = await tx.wait();
      const gasUsed = BigInt(receipt!.gasUsed) * BigInt(receipt!.gasPrice);
      const finalAdminBalance = await ethers.provider.getBalance(admin.address);

      expect(finalAdminBalance).to.equal(
        initialAdminBalance + ethAmount - gasUsed
      );
    });

    it("reverts when a non-admin tries to withdraw", async () => {
      const { keyCoin, user1 } = await loadFixture(deployKeyCoinFixture);
      await expect(keyCoin.connect(user1).withdraw())
        .to.be.revertedWithCustomError(keyCoin, "AccessControlUnauthorizedAccount")
        .withArgs(user1.address, DEFAULT_ADMIN_ROLE);
    });
  });
});
