const { expect } = require("chai");
const { getNamedAccounts, deployments, ethers } = require("hardhat");

describe("Raffle Contract", async () => {
  const eth = ethers.utils.parseEther("0.1");
  let contract, deployer;
  beforeEach(async () => {
    deployer = (await getNamedAccounts()).deployer;
    await deployments.fixture(["all"]);
    contract = await ethers.getContractAt("Raffle", deployer);
    console.log(contract.address);
  });

  describe("Pay", async () => {
    it("should pay and get the address that paid", async () => {
      await contract.pay({ value: eth });
      const bal = await ethers.provider.getBalance(contract.address);
      console.log(bal.toString());
      const paidPlayer = await contract.getPlayers(0);
      //   console.log(`Paid Player: ${paidPlayer}`);
      expect(paidPlayer).to.equal(deployer);
    });
  });
});
