import { ethers, network } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("Starting deployment...");

  try {
    // Get the deployment account
    const signers = await ethers.getSigners();
    if (signers.length === 0) {
      throw new Error("No signers found. Ensure the local Hardhat node is running.");
    }

    const deployer = signers[0];
    console.log("Deploying with account:", deployer.address);

    // Log the deployer's balance
    const balance = await deployer.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETH");

    // Define initial signers (using accounts 1, 2, and 3)
    const initialSigners = [signers[1].address, signers[2].address, signers[3].address];
    const threshold = 2; // Number of required confirmations

    console.log("\nDeploying MultisigWallet contract...");
    console.log("Initial signers:", initialSigners);
    console.log("Threshold:", threshold);

    // Deploy the contract
    const MultisigWallet = await ethers.getContractFactory("MultisigWallet");
    const multisigWallet = await MultisigWallet.deploy(initialSigners, threshold);
    await multisigWallet.waitForDeployment();

    const contractAddress = await multisigWallet.getAddress();
    console.log("\nMultisigWallet deployed successfully!");
    console.log("Contract address:", contractAddress);

    // Verify the deployment
    console.log("\nVerifying deployment...");

    // Check signers
    const deployedSigners = await multisigWallet.getSigners();
    console.log("Deployed signers:", deployedSigners);

    // Check threshold
    const deployedThreshold = await multisigWallet.threshold();
    console.log("Deployed threshold:", deployedThreshold);

    // Check transaction count
    const txCount = await multisigWallet.getTransactionCount();
    console.log("Initial transaction count:", txCount.toString());

    // Verify first signer's status
    const isFirstSignerValid = await multisigWallet.isSigner(signers[1].address);
    console.log("First signer status:", isFirstSignerValid);

    // Get contract balance
    const contractBalance = await ethers.provider.getBalance(contractAddress);
    console.log("Initial contract balance:", ethers.formatEther(contractBalance), "ETH");

    // Save deployment information
    const deploymentInfo = {
      network: network.name,
      contractAddress: contractAddress,
      signers: initialSigners,
      threshold: threshold.toString(),
      deploymentTime: new Date().toISOString(),
      initialBalance: ethers.formatEther(contractBalance),
    };

    // Ensure the deployments directory exists
    const deploymentsDir = path.join(__dirname, "deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir);
    }

    // Save deployment info to a file
    const deploymentFile = path.join(deploymentsDir, `deployment-${network.name}.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log("\nDeployment info saved to:", deploymentFile);

    // Final verification
    console.log("\nContract verification summary:");
    console.log(`- Network: ${network.name}`);
    console.log(`- Address: ${contractAddress}`);
    console.log(`- Required signatures: ${threshold} of ${initialSigners.length}`);
    console.log(`- Initial balance: ${ethers.formatEther(contractBalance)} ETH`);
  } catch (error) {
    console.error("\nError during deployment:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nUnhandled error:", error);
    process.exit(1);
  });