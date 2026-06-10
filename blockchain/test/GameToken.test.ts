import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

// GameToken — ERC-1155 license token with ERC-2981 royalties. The minter
// (GameStore in production) creates games and mints license units; royalty
// info is recorded per game at creation.
describe("GameToken", () => {
  const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));

  async function deployGameTokenFixture() {
    const [admin, gameStoreMock, vendor, buyer, unauthorizedUser] =
      await ethers.getSigners();

    const GameToken = await ethers.getContractFactory("GameToken");
    const gameToken = await GameToken.deploy();

    // gameStoreMock stands in for the GameStore that holds MINTER_ROLE.
    await gameToken.grantRole(MINTER_ROLE, gameStoreMock.address);

    return { gameToken, admin, gameStoreMock, vendor, buyer, unauthorizedUser };
  }

  describe("deployment", () => {
    it("grants DEFAULT_ADMIN_ROLE to the deployer", async () => {
      const { gameToken, admin } = await loadFixture(deployGameTokenFixture);
      expect(await gameToken.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.equal(
        true
      );
    });
  });

  describe("createGame", () => {
    it("lets the minter create a game and records its URI and royalty", async () => {
      const { gameToken, gameStoreMock, vendor } = await loadFixture(
        deployGameTokenFixture
      );
      const tokenId = 1n;
      const royaltyBps = 500n; // 5%
      const uri = "ipfs://QmTestURI";

      await gameToken
        .connect(gameStoreMock)
        .createGame(tokenId, vendor.address, royaltyBps, uri);
      expect(await gameToken.uri(tokenId)).to.equal(uri);

      const salePrice = ethers.parseEther("1");
      const [receiver, royaltyAmount] = await gameToken.royaltyInfo(
        tokenId,
        salePrice
      );
      expect(receiver).to.equal(vendor.address);
      expect(royaltyAmount).to.equal((salePrice * royaltyBps) / 10000n);
    });

    it("reverts when the royalty exceeds 10000 bps", async () => {
      const { gameToken, gameStoreMock, vendor } = await loadFixture(
        deployGameTokenFixture
      );
      await expect(
        gameToken
          .connect(gameStoreMock)
          .createGame(1n, vendor.address, 10001n, "ipfs://QmTestURI")
      ).to.be.revertedWith("GameToken: royalty too high");
    });

    it("reverts when the game already exists", async () => {
      const { gameToken, gameStoreMock, vendor } = await loadFixture(
        deployGameTokenFixture
      );
      const tokenId = 1n;
      await gameToken
        .connect(gameStoreMock)
        .createGame(tokenId, vendor.address, 500n, "ipfs://uri1");
      await expect(
        gameToken
          .connect(gameStoreMock)
          .createGame(tokenId, vendor.address, 500n, "ipfs://uri2")
      ).to.be.revertedWith("GameToken: game exists");
    });

    it("reverts when a non-minter tries to create a game", async () => {
      const { gameToken, unauthorizedUser, vendor } = await loadFixture(
        deployGameTokenFixture
      );
      await expect(
        gameToken
          .connect(unauthorizedUser)
          .createGame(1n, vendor.address, 500n, "ipfs://uri")
      )
        .to.be.revertedWithCustomError(
          gameToken,
          "AccessControlUnauthorizedAccount"
        )
        .withArgs(unauthorizedUser.address, MINTER_ROLE);
    });
  });

  describe("uri", () => {
    it("returns an empty string for a non-existent token", async () => {
      const { gameToken } = await loadFixture(deployGameTokenFixture);
      expect(await gameToken.uri(999n)).to.equal("");
    });
  });

  describe("mint", () => {
    it("lets the minter mint a license unit to a buyer", async () => {
      const { gameToken, gameStoreMock, vendor, buyer } = await loadFixture(
        deployGameTokenFixture
      );
      const tokenId = 1n;
      await gameToken
        .connect(gameStoreMock)
        .createGame(tokenId, vendor.address, 500n, "ipfs://QmTestURI");
      await gameToken.connect(gameStoreMock).mint(buyer.address, tokenId);
      expect(await gameToken.balanceOf(buyer.address, tokenId)).to.equal(1n);
    });

    it("reverts when a non-minter tries to mint", async () => {
      const { gameToken, unauthorizedUser, buyer } = await loadFixture(
        deployGameTokenFixture
      );
      await expect(gameToken.connect(unauthorizedUser).mint(buyer.address, 1n))
        .to.be.revertedWithCustomError(
          gameToken,
          "AccessControlUnauthorizedAccount"
        )
        .withArgs(unauthorizedUser.address, MINTER_ROLE);
    });
  });

  describe("supportsInterface", () => {
    it("supports the ERC1155, ERC2981 and AccessControl interfaces", async () => {
      const { gameToken } = await loadFixture(deployGameTokenFixture);
      expect(await gameToken.supportsInterface("0xd9b67a26")).to.equal(true); // ERC1155
      expect(await gameToken.supportsInterface("0x2a55205a")).to.equal(true); // ERC2981
      expect(await gameToken.supportsInterface("0x7965db0b")).to.equal(true); // AccessControl
    });
  });
});
