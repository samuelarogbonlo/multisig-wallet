const hre = require("hardhat");
const fs = require("fs");

async function main() {
  try {
    console.log("Starting deployment verification...");

    // Load deployment info
    if (!fs.existsSync("deployment-info.json")) {
      throw new Error("deployment-info.json not found. Please deploy the contract first.");
    }

    const deploymentInfo = JSON.parse(fs.readFileSync("deployment-info.json", "utf8"));
    console.log("\nDeployment Info:", deploymentInfo);

    // Connect to deployed contract
    const multisig = await hre.ethers.getContractAt(
      "MultisigWallet",
      deploymentInfo.contractAddress
    );

    console.log("\nVerifying contract state...");

    // Verify signers
    const currentSigners = await multisig.getSigners();
    console.log("\nCurrent Signers:", currentSigners);
    console.log("Expected Signers:", deploymentInfo.signers);

    if (JSON.stringify(currentSigners) !== JSON.stringify(deploymentInfo.signers)) {
      throw new Error("Signer mismatch!");
    }

    // Verify threshold
    const currentThreshold = await multisig.threshold();
    console.log("\nCurrent Threshold:", currentThreshold);
    console.log("Expected Threshold:", deploymentInfo.threshold);

    if (currentThreshold.toString() !== deploymentInfo.threshold) {
      throw new Error("Threshold mismatch!");
    }

    // Get contract balance
    const balance = await hre.ethers.provider.getBalance(deploymentInfo.contractAddress);
    console.log("\nContract Balance:", hre.ethers.formatEther(balance), "ETH");

    // Verify contract code
    const code = await hre.ethers.provider.getCode(deploymentInfo.contractAddress);
    if (code === "0x") {
      throw new Error("No contract code found at address!");
    }

    // Get transaction count
    const txCount = await multisig.getTransactionCount();
    console.log("Total Transactions:", txCount.toString());

    // Basic functionality test
    const [signer] = await hre.ethers.getSigners();
    const isSigner = await multisig.isSigner(deploymentInfo.signers[0]);
    console.log("\nVerifying basic functionality...");
    console.log("First signer status:", isSigner);

    // Summary
    console.log("\n✅ Verification completed successfully!");
    console.log("Contract is properly deployed and configured.");
    console.log(`Network: ${deploymentInfo.network}`);
    console.log(`Address: ${deploymentInfo.contractAddress}`);
    console.log(`Required Signatures: ${currentThreshold} of ${currentSigners.length}`);

  } catch (error) {
    console.error("\n❌ Verification failed:", error);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});