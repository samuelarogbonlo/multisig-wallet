const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("MultisigWallet", function () {
  async function deployMultisigFixture() {
    const [owner, signer1, signer2, signer3, nonSigner] = await ethers.getSigners();
    const signers = [signer1.address, signer2.address, signer3.address];
    const threshold = 2;

    const MultisigWallet = await ethers.getContractFactory("MultisigWallet");
    const multisig = await MultisigWallet.deploy(signers, threshold);

    return { multisig, owner, signer1, signer2, signer3, nonSigner, threshold };
  }

  describe("Deployment", function () {
    it("Should set the correct signers and threshold", async function () {
      const { multisig, signer1, signer2, signer3, threshold } = await loadFixture(deployMultisigFixture);

      const signers = await multisig.getSigners();
      expect(signers).to.have.length(3);
      expect(signers).to.include(signer1.address);
      expect(signers).to.include(signer2.address);
      expect(signers).to.include(signer3.address);
      expect(await multisig.threshold()).to.equal(threshold);
    });

    it("Should fail with invalid threshold", async function () {
      const [, signer1, signer2] = await ethers.getSigners();
      const MultisigWallet = await ethers.getContractFactory("MultisigWallet");

      await expect(MultisigWallet.deploy(
        [signer1.address, signer2.address],
        3
      )).to.be.revertedWith("invalid threshold");
    });
  });

  describe("Transaction Management", function () {
    it("Should submit and confirm transaction", async function () {
      const { multisig, signer1, signer2, nonSigner } = await loadFixture(deployMultisigFixture);
      const value = ethers.parseEther("1.0");
      const data = "0x";

      await expect(multisig.connect(signer1).submitTransaction(
        nonSigner.address,
        value,
        data
      )).to.emit(multisig, "SubmitTransaction");

      await expect(multisig.connect(signer1).confirmTransaction(0))
        .to.emit(multisig, "ConfirmTransaction");

      const tx = await multisig.getTransaction(0);
      expect(tx.numConfirmations).to.equal(1);
    });

    it("Should execute transaction with sufficient confirmations", async function () {
      const { multisig, signer1, signer2, nonSigner } = await loadFixture(deployMultisigFixture);

      // Fund the multisig
      await signer1.sendTransaction({
        to: await multisig.getAddress(),
        value: ethers.parseEther("2.0")
      });

      const value = ethers.parseEther("1.0");
      const data = "0x";

      await multisig.connect(signer1).submitTransaction(nonSigner.address, value, data);
      await multisig.connect(signer1).confirmTransaction(0);
      await multisig.connect(signer2).confirmTransaction(0);

      const initialBalance = await ethers.provider.getBalance(nonSigner.address);

      await expect(multisig.connect(signer1).executeTransaction(0))
        .to.emit(multisig, "ExecuteTransaction");

      const finalBalance = await ethers.provider.getBalance(nonSigner.address);
      expect(finalBalance - initialBalance).to.equal(value);
    });

    it("Should not execute without sufficient confirmations", async function () {
      const { multisig, signer1, nonSigner } = await loadFixture(deployMultisigFixture);

      const value = ethers.parseEther("1.0");
      await multisig.connect(signer1).submitTransaction(nonSigner.address, value, "0x");
      await multisig.connect(signer1).confirmTransaction(0);

      await expect(multisig.connect(signer1).executeTransaction(0))
        .to.be.revertedWith("insufficient confirmations");
    });
  });

  describe("Signer Management", function () {
    it("Should update signers with sufficient confirmations", async function () {
      const { multisig, signer1, signer2, signer3, nonSigner } = await loadFixture(deployMultisigFixture);

      const newSigners = [signer1.address, signer2.address, nonSigner.address];
      const newThreshold = 2;

      await multisig.connect(signer1).submitSignerUpdate(newSigners, newThreshold);
      await multisig.connect(signer1).confirmSignerUpdate(0);
      await multisig.connect(signer2).confirmSignerUpdate(0);

      await expect(multisig.connect(signer1).executeSignerUpdate(0))
        .to.emit(multisig, "SignerSetUpdateExecuted");

      const updatedSigners = await multisig.getSigners();
      expect(updatedSigners).to.deep.equal(newSigners);
      expect(await multisig.threshold()).to.equal(newThreshold);
    });

    it("Should not allow unauthorized signer updates", async function () {
      const { multisig, signer1, nonSigner } = await loadFixture(deployMultisigFixture);

      const newSigners = [signer1.address, nonSigner.address];
      await expect(multisig.connect(nonSigner).submitSignerUpdate(newSigners, 2))
        .to.be.revertedWith("not signer");
    });
  });

  describe("Edge Cases and Security", function () {
    it("Should not allow double execution of transactions", async function () {
      const { multisig, signer1, signer2, nonSigner } = await loadFixture(deployMultisigFixture);

      await signer1.sendTransaction({
        to: await multisig.getAddress(),
        value: ethers.parseEther("2.0")
      });

      await multisig.connect(signer1).submitTransaction(nonSigner.address, ethers.parseEther("1.0"), "0x");
      await multisig.connect(signer1).confirmTransaction(0);
      await multisig.connect(signer2).confirmTransaction(0);
      await multisig.connect(signer1).executeTransaction(0);

      await expect(multisig.connect(signer1).executeTransaction(0))
        .to.be.revertedWith("tx already executed");
    });

    it("Should handle failed transactions properly", async function () {
      const { multisig, signer1, signer2 } = await loadFixture(deployMultisigFixture);

      // Deploy a mock contract that will revert
      const MockContract = await ethers.getContractFactory("MultisigWallet"); // Using MultisigWallet as a mock
      const mockContract = await MockContract.deploy([signer1.address], 1);

      // Create a transaction that will fail (calling non-existent function)
      const failingData = ethers.keccak256(ethers.toUtf8Bytes("nonexistentFunction()")).slice(0, 10);

      await multisig.connect(signer1).submitTransaction(
        await mockContract.getAddress(),
        0,
        failingData
      );
      await multisig.connect(signer1).confirmTransaction(0);
      await multisig.connect(signer2).confirmTransaction(0);

      await expect(multisig.connect(signer1).executeTransaction(0))
        .to.be.revertedWith("tx failed");
    });
  });
});