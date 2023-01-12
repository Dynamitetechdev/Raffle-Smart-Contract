const { expect, assert } = require("chai");
const { getNamedAccounts, deployments, ethers, network } = require("hardhat");
const { networkConfig } = require("../helper-config");
const chainId = network.config.chainId;

chainId != 31337
  ? describe.skip
  : describe("Test Raffle", () => {
      let deployer, raffleContract, interval, mockVRFcoordinatorContract;
      const entranceFee = ethers.utils.parseEther("0.1");
      beforeEach(async () => {
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["all"]);
        raffleContract = await ethers.getContract("Raffle", deployer);
        mockVRFcoordinatorContract = await ethers.getContract(
          "VRFCoordinatorV2Mock",
          deployer
        );

        interval = await raffleContract.getInterval();
        console.log(raffleContract.address);
      });
      describe("constructor", () => {
        // it("the _vrfCoordinator addresss should be the mock address, since we are not on testnet", async () => {});
        it("should start at an OPEN state", async () => {
          const txResponse = await raffleContract.getRaffleState();
          await expect(txResponse.toString()).to.equal("0");
        });
        it("should give the specified entranceFee", async () => {
          const txResponse = await raffleContract.getEntranceFee();
          const specifiedEntranceFee = networkConfig[chainId]["entranceFee"];
          expect(txResponse).to.equal(specifiedEntranceFee.toString());
        });

        it("should set interval correctly", async () => {
          const givenInterval = networkConfig[chainId]["interval"];
          expect(interval).to.equal(givenInterval);
        });
      });

      describe("Pay", () => {
        it("should revert if there are not paying enough entranceFee", async () => {
          await expect(raffleContract.pay()).to.be.revertedWith(
            "Raffle_NotEnoughEth"
          );
        });

        it("should check if pay emit any event", async () => {
          const txResponse = await raffleContract.pay({ value: entranceFee });
          await expect(txResponse).to.emit(raffleContract, "raffleEnter");
        });
        it("should pay", async () => {
          const txResponse = await raffleContract.pay({
            value: entranceFee,
          });
          const txReceipt = await txResponse.wait(1);
          const getPlayer = await raffleContract.getPlayers(0);
          await expect(getPlayer).to.equal(deployer);
        });

        // it("should not allow anyone in if the raffle state is in pending", async () => {
        //   //1. we fund, meaning we are trying to enter raffle
        //   //2. we will make the checkUpkeep upKeepNeeded all true, so we can run the performUpKeep in other to request a random winner and during this time the raffle state will be pending.

        //   await raffleContract.pay({ value: entranceFee });
        //   await network.provider.send("evm_increaseTime", [
        //     interval.toNumber() + 1,
        //   ]);
        //   await network.provider.send("evm_mine", []);

        //   //we are acting like the chainLink Keeper here we will can the perform upKeep, and during this call the raffle state should be calculating and should not allow anyone enter
        //   await raffleContract.performUpkeep("0x");

        //   const txResponse = await raffleContract.pay({ value: entranceFee });
        //   await expect(txResponse).to.be.reverted();
        // });
      });

      describe("checkUpkeep", () => {
        it("should return false if there no payment yet", async () => {
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });

          const { upkeepNeeded } = await raffleContract.callStatic.checkUpkeep(
            "0x"
          );
          // assert will only run when it parameter is true.
          assert(!upkeepNeeded);
        });

        //return false if time hasnt passed
        it("return false if time hasnt passed", async () => {
          await raffleContract.pay({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() - 30,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });

          const { upkeepNeeded } = await raffleContract.callStatic.checkUpkeep(
            []
          );
          assert(!upkeepNeeded);
        });
      });

      describe("performUpKeep", () => {
        it("should revert if checkUpkeep is false", async () => {
          await raffleContract.pay({ value: entranceFee });
          await expect(raffleContract.performUpkeep("0x")).to.be.revertedWith(
            "Raffle_upKeepNotNeeded"
          );
        });
        it("should be in a calculating state, when we try to pay ", async () => {
          await raffleContract.pay({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);

          await raffleContract.performUpkeep("0x");

          await expect(
            raffleContract.pay({ value: entranceFee })
          ).to.be.revertedWith("Raffle_NotOpened");
        });

        it("should be true if checkUpKeep is true", async () => {
          await raffleContract.pay({ value: entranceFee });
          await network.provider.request({
            method: "evm_increaseTime",
            params: [interval.toNumber() + 1],
          });
          await network.provider.request({ method: "evm_mine", params: [] });

          const tx = raffleContract.performUpkeep("0x");
          assert(tx);
        });

        it("should revert if checkUpKeep is not needed", async () => {
          await expect(raffleContract.performUpkeep("0x")).to.be.revertedWith(
            "Raffle_upKeepNotNeeded"
          );
        });

        it("should check if an event is emitted and if state has changed", async () => {
          await raffleContract.pay({ value: entranceFee });
          await network.provider.request({
            method: "evm_increaseTime",
            params: [interval.toNumber() + 1],
          });
          await network.provider.request({
            method: "evm_mine",
            params: [],
          });

          const performUpKeep = await raffleContract.performUpkeep("0x");

          const txReceipt = await performUpKeep.wait(1);

          const requestId = txReceipt.events[1].args.requestId;
          const raffleState = await raffleContract.getRaffleState();

          // expect(raffleState.toString()).to.equal("1");
          // await expect(performUpKeep).to.emit(
          //   raffleContract,
          //   "requestedRaffleWinner"
          // );
          assert(requestId.toNumber() > 0);
        });
      });

      describe("fulfilRandomNumber", () => {
        beforeEach(async () => {
          // await raffleContract.pay({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
        });

        it.only("Pick a winner, reset timestamp, send money to the winner", async () => {
          const additionalPeople = 4;
          const accounts = await ethers.getSigners();
          let playerIndex = 1;
          for (let i = playerIndex; i <= additionalPeople + playerIndex; i++) {
            // console.log(accounts[i].address);
            const connectRaffleAccounts = await raffleContract.connect(
              accounts[i]
            );
            await connectRaffleAccounts.pay({
              value: ethers.utils.parseEther("1"),
            });
          }
          const lastTimeStamp = await raffleContract.getLastestTimeStamp();

          // performUpkeep has to be called before fulfilUpkeep can run
          // but we want to have the event to be trigger but we run anything else. just emulating the testnet, because we might not know the exact time the fulfillrandomWords will be called. but in this instance we know. but we are emulating the time and only when the fulfilrandomword is called that is when we want to run the test

          // assert the fulfilRandomword in Testnet. meaning we do have any time to emulate and we will work with listeners
          // here we also dont want to wait forever is theres an issue with the listerner. so we wil have a mocha timeout for that
          console.log("Waiting for listerner");

          await new Promise(async (resolve, reject) => {
            raffleContract.once("winnerPicked", async () => {
              //once the winnerPicked Event is been emitted we want to do some stuffs
              console.log("WinnerPicked Event Found!");
              try {
                const raffleWinner =
                  await raffleContract.getRecentRaffleWinner();
                console.log(raffleWinner);
                console.log(accounts[2].address);
                const playerList = await raffleContract.getPlayer();
                const raffleState = await raffleContract.getRaffleState();
                const endingTimeStamp =
                  await raffleContract.getLastestTimeStamp();

                assert(raffleState == 0);
                expect(playerList).to.equal(0);
                assert(endingTimeStamp > lastTimeStamp);
              } catch (error) {
                reject();
              }
              resolve();
            });

            const txResponse = await raffleContract.performUpkeep("0x");
            const txReceipt = await txResponse.wait(1);
            const requestId = txReceipt.events[1].args.requestId;

            await mockVRFcoordinatorContract.fulfillRandomWords(
              requestId,
              raffleContract.address
            );
          });

          // assert the fulfilRandomword in localhost. meaning we dont have any time to emulate

          // const balance = await ethers.provider.getBalance(
          //   raffleContract.address
          // );
          // console.log(balance);
          // const balanceStatus = balance > 0;

          // const playerList = await raffleContract.getPlayer();

          // assert(playerList == 0);
          // assert(!balanceStatus);
        });
      });
    });
