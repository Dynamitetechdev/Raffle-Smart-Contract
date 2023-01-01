const { ethers } = require("hardhat");
const hre = require("hardhat");

const main = async () => {
  await hre.run("compile");
  const contractFactory = await ethers.getContractFactory("store");
  const contract = await contractFactory.deploy();
  await contract.deployed();
  console.log("Contract Deployed.....");

  const TxResponse = await contract.storeFunc(9);
  const TxReceipt = await TxResponse.wait(1);
  console.log(TxReceipt.events[0]);
};

main().catch((e) => {
  console.log(e);
  process.exit(1);
});
