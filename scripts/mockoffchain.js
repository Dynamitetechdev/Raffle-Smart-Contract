const { ethers, network } = require("hardhat");
const chainId = network.config.chainId;
let raffleContract;
const mockKeepers = async () => {
  raffleContract = await ethers.getContract("Raffle");
  const checkData = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(""));
  const { upkeepNeeded } = await raffleContract.callStatic.checkUpkeep(
    checkData
  );
  if (upkeepNeeded) {
    const tx = await raffleContract.performUpkeep(checkData);
    const txReceipt = await tx.wait(1);
    const requestId = txReceipt.events[1].args.requestId;

    if (chainId == 31337) {
      await mockVrf(requestId, raffleContract.address);
    }
  }
};

const mockVrf = async (requestId, contractAddress) => {
  console.log(
    "We are now on localhost host, let pretend to be the VRF and keepers coordinators"
  );
  const mockContract = await ethers.getContract("VRFCoordinatorV2Mock");
  await mockContract.fulfillRandomWords(requestId, contractAddress);

  const winner = await raffleContract.getRecentRaffleWinner();
  console.log(`The Winner is ${winner}`);
  console.log("We are done pretending");
};

mockKeepers()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    process.exit(1);
    console.log(error);
  });
