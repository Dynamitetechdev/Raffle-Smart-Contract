//SPDX-License-Identifier: MIT
pragma solidity >0.5.1 <=0.9.0;

contract store {
    uint256 public storeNumber = 7;

    event storeNumberEvent(
        uint256 indexed oldNumber,
        uint256 indexed newNumber,
        uint256 indexed addedNumber,
        address sender
    );

    function storeFunc(uint256 newStoreNumber) public {
        storeNumber = newStoreNumber;

        emit storeNumberEvent(
            storeNumber,
            newStoreNumber,
            storeNumber + newStoreNumber,
            msg.sender
        );
    }
}
