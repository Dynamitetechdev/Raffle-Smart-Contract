const { expect, assert } = require("chai");
const { getNamedAccounts, ethers, network } = require("hardhat");
const chainId = network.config.chainId;

chainId == 31337 // localhost/hardhat
  ? describe.skip
  : describe("RaffleContract", () => {
      let deployer, raffleContract, entranceFee;
      beforeEach(async () => {
        deployer = (await getNamedAccounts()).deployer;
        raffleContract = await ethers.getContract("Raffle", deployer);
        entranceFee = raffleContract.getEntranceFee();
      });

      describe("fulfilRandomWords", () => {
        it("Should work with live chainlink keeper, vrf cood., and get a random winner", async () => {
          await new Promise(async (resolve, reject) => {
            console.log("fulfiling....");
            raffleContract.once("winnerPicked", async () => {
              console.log("WinnerPicked event!!!!");
              try {
                const player = await raffleContract.getPlayer();
                const raffleWinner =
                  await raffleContract.getRecentRaffleWinner();
                const raffleState = await raffleContract.getRaffleState();

                expect(raffleWinner).to.equal(deployer);
                expect(raffleState).to.equal(0);
                expect(player).to.equal(0);

                resolve();
              } catch (error) {
                reject(error);
              }
            });

            const tx = await raffleContract.pay({ value: entranceFee });
            await tx.wait(1);
            console.log("time to wait");
          });
        });
      });
    });
