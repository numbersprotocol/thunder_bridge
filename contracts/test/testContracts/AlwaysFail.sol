pragma solidity ^0.4.19;


contract AlwaysFail {
    constructor() {}

    function onTokenTransfer(address _from, uint256 _value, bytes _data) external returns(bool) {
        require(false, "always failed");
        return false;
    }
}