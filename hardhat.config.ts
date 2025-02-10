import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "./tasks/multisig"; // Load custom tasks
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      accounts: [
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // Private key for 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
        "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", // Private key for 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
        "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a", // Private key for 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
        "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6", // Private key for 0x90F79bf6EB2c4f870365E785982E1f101E93b906
      ],
    },
    sepolia: {
      url: process.env.SEPOLIA_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  gasReporter: {
    enabled: true,
    currency: "USD",
  },
};

export default config;