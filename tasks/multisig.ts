import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { MultisigWallet } from "../typechain-types";
import { ethers } from "ethers";

task("get-signers", "Gets current signer set")
  .addParam("contract", "The multisig wallet address")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const multisig = (await hre.ethers.getContractAt(
      "MultisigWallet",
      taskArgs.contract
    )) as unknown as MultisigWallet;
    const signers = await multisig.getSigners();
    console.log("Current signers:", signers);
  });

task("submit-tx", "Submits a new transaction to the multisig wallet")
  .addParam("contract", "The multisig wallet address")
  .addParam("to", "Destination address")
  .addParam("value", "Amount of ETH to send")
  .addParam("data", "Transaction data in hex")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const [deployer, signer1] = await hre.ethers.getSigners(); // Use the second account (signer1)
    const multisig = (await hre.ethers.getContractAt(
      "MultisigWallet",
      taskArgs.contract,
      signer1 // Use signer1 as the signer
    )) as unknown as MultisigWallet;

    const tx = await multisig.submitTransaction(
      taskArgs.to,
      ethers.parseEther(taskArgs.value),
      taskArgs.data
    );
    await tx.wait();
    console.log("Transaction submitted:", tx.hash);
  });

task("confirm-tx", "Confirms a pending transaction")
  .addParam("contract", "The multisig wallet address")
  .addParam("txindex", "Transaction index to confirm")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const [deployer, signer1, signer2] = await hre.ethers.getSigners(); // Use the third account (signer2)
    const multisig = (await hre.ethers.getContractAt(
      "MultisigWallet",
      taskArgs.contract,
      signer2 // Use signer2 as the signer
    )) as unknown as MultisigWallet;

    const tx = await multisig.confirmTransaction(taskArgs.txindex);
    await tx.wait();
    console.log("Transaction confirmed by second signer:", tx.hash);
  });

task("execute-tx", "Executes a confirmed transaction")
  .addParam("contract", "The multisig wallet address")
  .addParam("txindex", "Transaction index to execute")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const [deployer, signer1] = await hre.ethers.getSigners(); // Use the second account (signer1)
    const multisig = (await hre.ethers.getContractAt(
      "MultisigWallet",
      taskArgs.contract,
      signer1 // Use signer1 as the signer
    )) as unknown as MultisigWallet;

    const tx = await multisig.executeTransaction(taskArgs.txindex);
    await tx.wait();
    console.log("Transaction executed:", tx.hash);
  });

task("submit-signer-update", "Submits a signer set update")
  .addParam("contract", "The multisig wallet address")
  .addParam("signers", "Comma-separated list of new signer addresses")
  .addParam("threshold", "New threshold value")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const multisig = (await hre.ethers.getContractAt(
      "MultisigWallet",
      taskArgs.contract
    )) as unknown as MultisigWallet;
    const newSigners = taskArgs.signers.split(",");
    const tx = await multisig.submitSignerUpdate(newSigners, taskArgs.threshold);
    await tx.wait();
    console.log("Signer update submitted:", tx.hash);
  });

task("get-tx-details", "Gets details of a specific transaction")
  .addParam("contract", "The multisig wallet address")
  .addParam("txindex", "Transaction index")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const multisig = (await hre.ethers.getContractAt(
      "MultisigWallet",
      taskArgs.contract
    )) as unknown as MultisigWallet;

    const tx = await multisig.getTransaction(taskArgs.txindex);
    console.log(`\nTransaction ${taskArgs.txindex}:`);
    console.log(`- To: ${tx.to}`);
    console.log(`- Value: ${ethers.formatEther(tx.value)} ETH`);
    console.log(`- Data: ${tx.data}`);
    console.log(`- Executed: ${tx.executed}`);
    console.log(`- Confirmations: ${tx.numConfirmations}`);
  });

task("get-balance", "Gets the balance of the multisig wallet")
  .addParam("contract", "The multisig wallet address")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const balance = await hre.ethers.provider.getBalance(taskArgs.contract);
    console.log("Multisig wallet balance:", ethers.formatEther(balance), "ETH");
  });

task("get-recipient-balance", "Gets the balance of a recipient address")
  .addParam("address", "The recipient address")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const balance = await hre.ethers.provider.getBalance(taskArgs.address);
    console.log("Recipient balance:", ethers.formatEther(balance), "ETH");
  });