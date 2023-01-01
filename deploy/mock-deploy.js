const { network, ethers } = require("hardhat");
const { networkConfig } = require("../helper-config");
module.exports = async ({ deployments, getNamedAccounts }) => {
  const { deployer, player } = await getNamedAccounts();
  const { deploy, log } = deployments;
  const chainId = network.config.chainId;

  const BASE_FEE = ethers.utils.parseEther("0.25"); //a fee for every request we make, the base_fee is the premium fee we pay in LINK
  const GAS_PRICE_LINK = 1e9; //link token per gas

  if (chainId == 31337) {
    log("Mock Detected, Mock Deploying");
    const mockVrfCoordinator = await deploy("VRFCoordinatorV2Mock", {
      contract: "VRFCoordinatorV2Mock",
      from: deployer,
      args: [BASE_FEE, GAS_PRICE_LINK],
      log: true,
    });
    log("Mock Deployed");
    log("_____________________________");
  }
};

module.exports.tags = ["all", "mock"];
