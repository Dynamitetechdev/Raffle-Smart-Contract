const { ethers, network } = require("hardhat");
const { networkConfig } = require("../helper-config");
const { verify } = require("../utils/verify");
require("dotenv").config();
module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deployer } = await getNamedAccounts();
  const { deploy, log } = deployments;
  const chainId = network.config.chainId;
  let mockVrfCoordinatorContract, vrfCoordinatorAddress, subId;
  const SUB_FUND_AMOUNT = ethers.utils.parseEther("2");
  console.log("Deploying Contract....");

  if (chainId == 31337) {
    // my new way of deploying now
    mockVrfCoordinatorContract = await ethers.getContract(
      "VRFCoordinatorV2Mock"
    );
    vrfCoordinatorAddress = mockVrfCoordinatorContract.address;

    //for subId on localhost or hardhat or dev chain we will programmatically create a subscription for that
    const txResponse = await mockVrfCoordinatorContract.createSubscription();
    const txReceipt = await txResponse.wait(1);
    subId = txReceipt.events[0].args.subId;
    //fund the subscribtion account
    await mockVrfCoordinatorContract.fundSubscription(subId, SUB_FUND_AMOUNT);
  } else {
    vrfCoordinatorAddress = networkConfig[chainId]["vrfCoordinatorAddress"];
    subId = networkConfig[chainId]["subId"];
  }
  const entranceFee = networkConfig[chainId]["entranceFee"];

  const keyHash = networkConfig[chainId]["keyHash"];

  const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"];

  const interval = networkConfig[chainId]["interval"];
  const args = [
    vrfCoordinatorAddress,
    entranceFee,
    keyHash,
    subId,
    callbackGasLimit,
    interval,
  ];

  log("Deploying Raffle Contract....");
  const raffleContract = await deploy("Raffle", {
    from: deployer,
    args: args,
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });
  log("Deployed Raffle Contract");

  // adding a customer to our Mock VRF subscription
  if (chainId == 31337) {
    await mockVrfCoordinatorContract.addConsumer(
      subId.toNumber(),
      raffleContract.address
    );
  }

  log("verifing Raffle Contract.....");
  const ETHERSCAN_APIKEY = process.env.ETHERSCAN_APIKEY;
  // Verify our raffle contract on testNet
  if (chainId != 31337 && ETHERSCAN_APIKEY) {
    await verify(raffleContract.address, args);
  }
  log("Verification Done");
  log("____________________________");
};

module.exports.tags = ["all", "raffle"];
