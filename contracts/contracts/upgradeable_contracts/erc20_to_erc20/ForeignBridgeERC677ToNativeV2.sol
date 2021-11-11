pragma solidity 0.4.24;

import "./ForeignBridgeERC677ToNative.sol";

contract ForeignBridgeERC677ToNativeV2 is ForeignBridgeERC677ToNative {

    function callToken(bytes data) onlyOwner payable external returns(bool) {
        require(erc677token().call.value(msg.value)(data));
        return true;
    }

    function setErc20token(address _token) private {
        setErc677token(_token);
    }
}
