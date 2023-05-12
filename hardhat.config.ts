import * as dotenv from "dotenv";

import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-deploy";
import "hardhat-docgen";
import "@primitivefi/hardhat-dodoc";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.17",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.4.18",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  namedAccounts: {
    deployer: 0,
    signer: 1,
    treasury: 3,
    coindev: 4,
    staker: 5,
    bob: 6,
    alice: 7,
  },
  networks: {
    hardhat: {
      accounts: {
        mnemonic: process.env.MNEMONIC_TESTNET
          ? process.env.MNEMONIC_TESTNET
          : "",
      },
      saveDeployments: false,
      deploy: ["deploy/bsc/"],
      tags: ["testnet"],
    },
    bscTestnet: {
      url: process.env.BSCTESTNET_URL || "",
      accounts: {
        mnemonic: process.env.MNEMONIC_TESTNET
          ? process.env.MNEMONIC_TESTNET
          : "",
      },
      saveDeployments: true,
      deploy: ["deploy/bsc/"],
      tags: ["testnet"],
    },
    sepolia: {
      url: process.env.SEPOLIA_URL || "",
      accounts: {
        mnemonic: process.env.MNEMONIC_TESTNET
          ? process.env.MNEMONIC_TESTNET
          : "",
      },
      saveDeployments: true,
      deploy: ["deploy/bsc/"],
      tags: ["testnet"],
    },
    bsc: {
      url: process.env.BSC_URL || "",
      chainId: 56,
      accounts: {
        mnemonic: process.env.MNEMONIC_MAINNET
          ? process.env.MNEMONIC_MAINNET
          : "",
      },
      saveDeployments: true,
      deploy: ["deploy/bsc/"],
    },
    mainnet: {
      url: process.env.MAINNET_URL || "",
      chainId: 1,
      accounts: {
        mnemonic: process.env.MNEMONIC_MAINNET
          ? process.env.MNEMONIC_MAINNET
          : "",
      },
      saveDeployments: true,
      deploy: ["deploy/bsc/"],
    },
    decimalTestnet: {
      url: process.env.DECIMAL_TEST_URL || "",
      accounts: {
        mnemonic: process.env.MNEMONIC_TESTNET
          ? process.env.MNEMONIC_TESTNET
          : "",
      },
      saveDeployments: true,
      deploy: ["deploy/bsc/"],
    },
    decimal: {
      url: process.env.DECIMAL_URL || "",
      accounts: {
        mnemonic: process.env.MNEMONIC_MAINNET
          ? process.env.MNEMONIC_MAINNET
          : "",
      },
      saveDeployments: true,
      deploy: ["deploy/bsc/"],
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS ? true : false,
    currency: "USD",
    // gasPrice: 100,
    token: "ETH",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
  etherscan: {
    apiKey: {
      bscTestnet: process.env.BSCSCAN_API_KEY || "",
      bsc: process.env.BSCSCAN_API_KEY || "",
      mainnet: process.env.ETHERSCAN_API_KEY || "",
      sepolia: process.env.ETHERSCAN_API_KEY || "",
    },
  },
  verify: {
    etherscan: {
      apiKey: process.env.BSCSCAN_API_KEY || "",
    },
  },
  docgen: {
    path: "./dev-docs",
    clear: true,
    runOnCompile: false,
  },
  dodoc: {
    runOnCompile: false,
    debugMode: false,
    freshOutput: true,
    keepFileStructure: true,
    outputDir: "docs",
  },
};

export default config;
