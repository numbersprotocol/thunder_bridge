pragma solidity 0.4.24;

import "./ERC677InitializableToken.sol";

contract ERC677InitializableBridgeToken is ERC677InitializableToken {
    mapping(address => bool) internal validBridgeContract;

    function initialize(string _name, string _symbol, uint8 _decimals, address _owner) external initializer {
        ERC20Mintable.initialize(_owner);
        ERC20Detailed.initialize(_name, _symbol, _decimals);
    }

    function addBridgeContract(address _contract) onlyOwner public {
        require(_contract != address(0) && isContract(_contract));
        validBridgeContract[_contract] = true;
    }

    function removeBridgeContract(address _contract) onlyOwner public {
        require(_contract != address(0) && isContract(_contract));
        validBridgeContract[_contract] = false;
    }

    function isBridgeContract(address _contract) public view returns (bool) {
        return validBridgeContract[_contract];
    }

    function transferAndCall(address _to, uint _value, bytes _data)
        external validRecipient(_to) returns (bool)
    {
        require(superTransfer(_to, _value));
        fundReceiver(_to);
        emit Transfer(msg.sender, _to, _value, _data);

        if (isContract(_to) && !contractFallback(_to, _value, _data)) {
            if (isBridgeContract(_to)) {
                revert("reverted here");
            } else {
                emit ContractFallbackCallFailed(msg.sender, _to, _value);
            }
        }

        return true;
    }

    function transfer(address _to, uint256 _value) public returns (bool)
    {
        require(superTransfer(_to, _value), "failed superTransfer");
        fundReceiver(_to);
        if (isBridgeContract(_to) && !contractFallback(_to, _value, new bytes(0))) {
            revert("reverted here");
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
