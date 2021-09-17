pragma solidity 0.4.24;

import "openzeppelin-eth/contracts/token/ERC20/IERC20.sol";
import "./BasicBridge.sol";

contract IFundableERC20Token is IERC20 {
    function setFundingRules(uint256 _periodLength, uint256 _maxPeriodFunds, uint256 _threshold, uint256 _amount) public;
}

contract ERC20Bridge is BasicBridge {
    function erc20token() public view returns (IFundableERC20Token) {
        return IFundableERC20Token(addressStorage[keccak256(abi.encodePacked("erc20token"))]);
    }

    function setErc20token(address _token) internal {
        require(_token != address(0) && isContract(_token));
        addressStorage[keccak256(abi.encodePacked("erc20token"))] = _token;
    }

    function onTokenTransfer(address _from, uint256 _value, bytes /*_data*/) external returns (bool) {
        require(msg.sender == address(erc20token()));
        require(withinLimit(_value));
        setTotalSpentPerDay(getCurrentDay(), totalSpentPerDay(getCurrentDay()).add(_value));
        fireEventOnTokenTransfer(_from, _value);
        return true;
    }

    function setFundingRules(uint256 _periodLength, uint256 _maxPeriodFunds, uint256 _threshold, uint256 _amount) onlyOwner public {
        erc20token().setFundingRules(_periodLength, _maxPeriodFunds, _threshold, _amount);
    }

    function fireEventOnTokenTransfer(address /*_from */, uint256 /* _value */) internal {
        // has to be defined
    }
}