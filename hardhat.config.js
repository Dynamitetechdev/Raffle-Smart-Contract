require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-deploy");
require("solidity-coverage");
require("hardhat-gas-reporter");
require("hardhat-contract-sizer"); // new
require("dotenv").config();
/** @type import('hardhat/config').HardhatUserConfig */

const RPC = process.env.GOERLI_RPC;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 31337,
      blockConfirmations: 1,
    },
    goerli: {
      url: RPC,
      accounts: [PRIVATE_KEY],
      chainId: 5,
      blockConfirmations: 6,
    },
  },
  solidity: "0.8.17",
  namedAccounts: {
    deployer: {
      default: 0,
      5: 0,
    },
    player: {
      default: 1,
      5: 1,
    },
  },
};
