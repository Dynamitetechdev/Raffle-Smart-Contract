//1. players should be able to pay a minimum amount and we should keep track of players
//2. we also want the user to be able to get the raffle Minimum Pay
//3. bring in the VRFConsumerBaseV2,
//SPDX-License-Identifier: MIT
pragma solidity >0.5.1 <=0.9.0;
// we need to make our contract a VRFConsumerBase, we will inherit and implement the fulfillRandomWords function from it and it will be part of our constructor with the coordinator address
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";

// to work with the requesting random numbers we will need to call the VRFCoordinatorV2Interface contract and the address so we can work with it.
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";

//For The Time Keep Automation
import "@chainlink/contracts/src/v0.8/AutomationCompatible.sol";

error Raffle_NotEnoughEth();
error Raffle_transferFailed();
error Raffle_NotOpened();

error Raffle_upKeepNotNeeded(
    uint256 contractBalance,
    uint256 noOfPlayers,
    uint256 raffleState
);

contract Raffle is VRFConsumerBaseV2, AutomationCompatibleInterface {
    /* Type Declarations */

    //in other use enums, we will create a state variable using the type Raffle_state
    enum Raffle_state {
        OPEN,
        CALCULATING
    }

    uint256 public immutable i_entranceFee;
    address payable[] public s_players;
    bytes32 private immutable i_keyHash;
    uint64 private immutable i_subId;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private immutable i_callbackGasLimit;
    uint32 private constant NUM_WORDS = 1;
    VRFCoordinatorV2Interface private immutable i_VRFCoordinator;
    Raffle_state private s_raffleState;
    uint256 private s_lastTimeStamp;
    uint256 private immutable i_interval;

    //Lottery Variables
    address private recentRaffleWinner;
    // Request Id
    uint256 private request_id;

    event raffleEnter(address indexed player);
    event requestedRaffleWinner(uint256 indexed requestId);
    event winnerPicked(address indexed winner);

    // we are working with the VRFConsumerBaseV2 and _vrfCoordinator represent the address to get verified random number and we are passing it through the constructor
    constructor(
        address _vrfCoordinator, // an contract address that does the randomness
        uint256 entranceFee,
        bytes32 keyHash,
        uint64 subId,
        uint32 callbackGasLimit,
        uint256 interval
    ) VRFConsumerBaseV2(_vrfCoordinator) {
        i_entranceFee = entranceFee;
        i_VRFCoordinator = VRFCoordinatorV2Interface(_vrfCoordinator);
        i_keyHash = keyHash;
        i_subId = subId;
        i_callbackGasLimit = callbackGasLimit;
        s_raffleState = Raffle_state.OPEN; // we want the state of the raffle open when we first deploy
        s_lastTimeStamp = block.timestamp; // after we get the last TIME STAMP, which is when the time begin counting, we want to set the interval we want to wait between the last time stamp and the current timestamp. so we will create a new state and pass it through when we first deployed the contract
        i_interval = interval;
    }

    function pay() public payable {
        //we also want to  check if the lottery is Open before people can play
        if (s_raffleState != Raffle_state.OPEN) {
            revert Raffle_NotOpened();
        }
        if (msg.value < i_entranceFee) {
            revert Raffle_NotEnoughEth();
        }
        s_players.push(payable(msg.sender));

        //emit event
        emit raffleEnter(msg.sender);
    }

    // CHAIN LINK UP KEEP, To Set the time interval to trigger the randomness event

    /* this function returns true in other for the performUpkeep to get us a random number, but we need some thing to be true and validate before our upkeepNeeded returns true

    1. the time interval specified for it should have passed
    2. Lottery should and atleast a player and some eth
    3. our subscription is funded with LINK token
    4. we want lottery to be in a "open state", which means we want lottery to be opened for player to come in at first. and when we are waiting for a random number we dont want any one else to be able to come in the lottery so we want to have some states to validate that. we are using ENUMs for this
    */

    // by default is an external function,meaning we cant use it in our own function, so we are changing to public so we can useit
    function checkUpkeep(
        bytes memory /* checkdata */
    )
        public
        view
        override
        returns (bool upkeepNeeded, bytes memory /* performData*/)
    {
        bool isOpen = (Raffle_state.OPEN == s_raffleState);

        // we want to set our inerval will block.stamp
        bool timePassed = ((block.timestamp - s_lastTimeStamp) > i_interval);

        //checking if we have enough players
        bool hasPlayers = (s_players.length > 0);

        //check if we have a balance
        bool hasBalance = address(this).balance > 0;

        upkeepNeeded = (isOpen && timePassed && hasPlayers && hasBalance);
    }

    function performUpkeep(bytes calldata /* calldata*/) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");
        if (!upkeepNeeded) {
            // we will also add some variable so that who ever is running into this bug will know whats happening
            // we will pass the balance of contract, the length of players, and the state
            revert Raffle_upKeepNotNeeded(
                address(this).balance,
                s_players.length,
                uint256(s_raffleState)
            );
        }
        //When we are requesting a random number, means all the player are complete other validation passed, so we want to be in a calculating state so that others cant jump in.
        s_raffleState = Raffle_state.CALCULATING;

        // This RequestFunction Returns a uint256 uniqueId, that represent who is requesting this 
        request_id = i_VRFCoordinator.requestRandomWords(
            i_keyHash, //gaslane - represent the specified gas limit we are willing to pay for the Tx.
            i_subId, // represent subID that the consuming contract is registered.
            REQUEST_CONFIRMATIONS, // The number of block confirmations the VRF service will wait to respond.
            i_callbackGasLimit, //The maximum amount of gas a user is willing to pay for completing the callback VRF function. Note that you cannot put a value larger than maxGasLimit of the VRF Coordinator contract
            NUM_WORDS // The number of random numbers to request, in our case we will be requesting 1
        );

        emit requestedRaffleWinner(request_id);
    }

    //fulfillRandomWords Function
    function fulfillRandomWords(
        uint256 /* requestId */,
        uint256[] memory randomWords
    ) internal override {
        // getting a random number within the length of our array and the randomWords from VRF using modulo
        uint256 indexOfWinner = randomWords[0] % s_players.length;

        //setting the indexOfWinner to the specified winner in the s_players array
        address payable addressOfWinner = s_players[indexOfWinner];

        // setting a function to let user know who the recentwinner is
        recentRaffleWinner = addressOfWinner;

        // sending the recent winner the token
        (bool success, ) = addressOfWinner.call{value: address(this).balance}(
            ""
        );
        
        if (!success) {
            revert Raffle_transferFailed();
        }
        s_raffleState = Raffle_state.OPEN;

        //resetting our array, after winner has been picked
        s_players = new address payable[](0);

        // Resset the time stamp
        s_lastTimeStamp = block.timestamp;


        //keeping track of recent event winner using event and emit
        emit winnerPicked(addressOfWinner);
    }

    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getPlayers(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getRecentRaffleWinner() public view returns (address) {
        return recentRaffleWinner;
    }

    function getRaffleState() public view returns (Raffle_state) {
        return s_raffleState;
    }

    function getPlayer() public view returns (uint256) {
        return s_players.length;
    }

    function getNumWords() public pure returns (uint256) {
        return NUM_WORDS;
    }

    function getLastestTimeStamp() public view returns (uint256) {
        return s_lastTimeStamp;
    }

    function getRequestConfirmations() public pure returns (uint256) {
        return REQUEST_CONFIRMATIONS;
    }

    function getInterval() public view returns(uint256){
        return i_interval;
    }
}
