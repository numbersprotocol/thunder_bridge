pragma solidity 0.4.24;

import "./ForeignBridgeErc677ToErc677.sol";

contract ForeignBridgeErc677ToErc677V2 is ForeignBridgeErc677ToErc677 {
    function setErc20token(address _token) private {
        setErc677token(_token);
    }

    function callToken(bytes data) onlyOwner payable external returns(bool) {
        require(erc677token().call.value(msg.value)(data));
        return true;
    }
}