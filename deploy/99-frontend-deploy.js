const { ethers, network } = require("hardhat");
const fs = require("fs");
const FRONTEND_ADDRESS_FILE =
  "../../raffle-Frontend/my-app/src/constant/contractaddress.json";

const FRONTEND_ABI_FILE = "../../raffle-Frontend/my-app/src/constant/abi.json";
module.exports = async () => {
  if (process.env.UPDATE_FRONTEND) {
    console.log("Updating Frontend....");
    await updateFrontend();
    await updateABI();

    console.log("update Complete");
  }
};

const updateABI = async () => {
  const raffle = await ethers.getContract("Raffle");
  fs.writeFileSync(
    FRONTEND_ABI_FILE,
    raffle.interface.format(ethers.utils.FormatTypes.json)
  );
};
const chainId = network.config.chainId;
const updateFrontend = async () => {
  // getting our contract
  const raffle = await ethers.getContract("Raffle");

  const contractAddresses = JSON.parse(
    fs.readFileSync(FRONTEND_ADDRESS_FILE, "utf8")
  );

  if (chainId in contractAddresses) {
    if (!contractAddresses[chainId].includes(raffle.address)) {
      contractAddresses[chainId].push(raffle.address);
    }
  }
  {
    contractAddresses[chainId] = [raffle.address];
  }
  fs.writeFileSync(FRONTEND_ADDRESS_FILE, JSON.stringify(contractAddresses));
};

module.exports.tags = ["all", "frontend"];
