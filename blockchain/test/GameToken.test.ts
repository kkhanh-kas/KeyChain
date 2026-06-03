import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameToken", function () {
  const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));

  async function deployGameTokenFixture() {
    const [admin, gameStoreMock, vendor, buyer, unauthorizedUser] = await ethers.getSigners();
    
    const GameToken = await ethers.getContractFactory("GameToken");
    const gameToken = await GameToken.deploy();

    // Cấp quyền MINTER_ROLE cho gameStoreMock để phục vụ việc test
    await gameToken.grantRole(MINTER_ROLE, gameStoreMock.address);

    return { gameToken, admin, gameStoreMock, vendor, buyer, unauthorizedUser };
  }

  describe("Deployment", function () {
    it("Should grant DEFAULT_ADMIN_ROLE to deployer", async function () {
      const { gameToken, admin } = await loadFixture(deployGameTokenFixture);
      expect(await gameToken.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
    });
  });

  describe("createGame", function () {
    it("Should allow MINTER_ROLE to create a game and set properties", async function () {
      const { gameToken, gameStoreMock, vendor } = await loadFixture(deployGameTokenFixture);
      const tokenId = 1n;
      const royaltyBps = 500n; // 5%
      const uri = "ipfs://QmTestURI";

      await gameToken.connect(gameStoreMock).createGame(tokenId, vendor.address, royaltyBps, uri);

      expect(await gameToken.uri(tokenId)).to.equal(uri);

      // Kiểm tra royalty logic
      const salePrice = ethers.parseEther("1");
      const [receiver, royaltyAmount] = await gameToken.royaltyInfo(tokenId, salePrice);
      expect(receiver).to.equal(vendor.address);
      expect(royaltyAmount).to.equal((salePrice * royaltyBps) / 10000n);
    });

    it("Should revert if royalty is greater than 10000", async function () {
      const { gameToken, gameStoreMock, vendor } = await loadFixture(deployGameTokenFixture);
      const tokenId = 1n;
      const royaltyBps = 10001n; 
      const uri = "ipfs://QmTestURI";

      await expect(
        gameToken.connect(gameStoreMock).createGame(tokenId, vendor.address, royaltyBps, uri)
      ).to.be.revertedWith("GameToken: royalty too high");
    });

    it("Should revert if the game already exists", async function () {
      const { gameToken, gameStoreMock, vendor } = await loadFixture(deployGameTokenFixture);
      const tokenId = 1n;
      
      await gameToken.connect(gameStoreMock).createGame(tokenId, vendor.address, 500n, "ipfs://uri1");
      
      await expect(
        gameToken.connect(gameStoreMock).createGame(tokenId, vendor.address, 500n, "ipfs://uri2")
      ).to.be.revertedWith("GameToken: game exists");
    });

    it("Should revert if non-minter tries to create a game", async function () {
      const { gameToken, unauthorizedUser, vendor } = await loadFixture(deployGameTokenFixture);
      
      await expect(
        gameToken.connect(unauthorizedUser).createGame(1n, vendor.address, 500n, "ipfs://uri")
      ).to.be.revertedWithCustomError(gameToken, "AccessControlUnauthorizedAccount")
        .withArgs(unauthorizedUser.address, MINTER_ROLE);
    });
  });

  describe("mint", function () {
    it("Should allow MINTER_ROLE to mint token to a buyer", async function () {
      const { gameToken, gameStoreMock, vendor, buyer } = await loadFixture(deployGameTokenFixture);
      const tokenId = 1n;
      
      // Khởi tạo game trước
      await gameToken.connect(gameStoreMock).createGame(tokenId, vendor.address, 500n, "ipfs://QmTestURI");
      
      // Mint license
      await gameToken.connect(gameStoreMock).mint(buyer.address, tokenId);
      
      expect(await gameToken.balanceOf(buyer.address, tokenId)).to.equal(1n);
    });

    it("Should revert if non-minter tries to mint", async function () {
      const { gameToken, unauthorizedUser, buyer } = await loadFixture(deployGameTokenFixture);
      
      await expect(
        gameToken.connect(unauthorizedUser).mint(buyer.address, 1n)
      ).to.be.revertedWithCustomError(gameToken, "AccessControlUnauthorizedAccount")
        .withArgs(unauthorizedUser.address, MINTER_ROLE);
    });
  });

  describe("supportsInterface", function () {
    it("Should support ERC1155, ERC2981 and AccessControl interfaces", async function () {
      const { gameToken } = await loadFixture(deployGameTokenFixture);
      
      const ERC1155_INTERFACE_ID = "0xd9b67a26";
      const ERC2981_INTERFACE_ID = "0x2a55205a";
      const ACCESS_CONTROL_INTERFACE_ID = "0x7965db0b";

      expect(await gameToken.supportsInterface(ERC1155_INTERFACE_ID)).to.be.true;
      expect(await gameToken.supportsInterface(ERC2981_INTERFACE_ID)).to.be.true;
      expect(await gameToken.supportsInterface(ACCESS_CONTROL_INTERFACE_ID)).to.be.true;
    });
  });
});