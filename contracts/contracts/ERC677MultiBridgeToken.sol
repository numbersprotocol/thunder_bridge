pragma solidity 0.4.24;

import "./ERC677BridgeToken.sol";

contract ERC677MultiBridgeToken is ERC677BridgeToken {
    mapping(bytes32 => bool) internal boolStorage;

    constructor(
        string _name,
        string _symbol,
        uint8 _decimals)
    public ERC677BridgeToken(_name, _symbol, _decimals) {}

    function addBridgeContract(address _bridgeContract) onlyOwner public {
        require(_bridgeContract != address(0) && isContract(_bridgeContract));
        boolStorage[keccak256(abi.encodePacked("bridgeContract", _bridgeContract))] = true;
    }

    function isBridgeContract(address _bridge) public view returns (bool) {
        return boolStorage[keccak256(abi.encodePacked("bridgeContract", _bridge))];
    }

    function transfer(address _to, uint256 _value) public returns (bool)
    {
        require(superTransfer(_to, _value), "failed superTransfer");
        fundReceiver(_to);
        if (isContract(_to) && !contractFallback(_to, _value, new bytes(0))) {
            if (isBridgeContract(_to)) {
                revert("reverted here");
            } else {
                emit ContractFallbackCallFailed(msg.sender, _to, _value);
            }
        }
        return true;
    }

    function contractFallback(address _to, uint _value, bytes _data)
        private
        returns(bool)
    {
        return _to.call(abi.encodeWithSignature("onTokenTransfer(address,uint256,bytes)",  msg.sender, _value, _data));
    }

    function isContract(address _addr)
        private
        view
        returns (bool)
    {
        uint length;
        assembly { length := extcodesize(_addr) }
        return length > 0;
    }
}
