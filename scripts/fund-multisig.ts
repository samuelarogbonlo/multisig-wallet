import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const multisigAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Replace with your multisig address
  const amount = ethers.parseEther("1.0"); // Send 1 ETH

  console.log("Funding multisig wallet...");
  console.log("Sending", ethers.formatEther(amount), "ETH to", multisigAddress);

  const tx = await deployer.sendTransaction({
    to: multisigAddress,
    value: amount,
  });
  await tx.wait();

  console.log("Funding successful! Transaction hash:", tx.hash);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });