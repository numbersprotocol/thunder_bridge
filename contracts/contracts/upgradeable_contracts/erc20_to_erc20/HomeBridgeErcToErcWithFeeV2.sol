
pragma solidity 0.4.24;

import "./HomeBridgeErcToErcWithFee.sol";
import "../../IMinterBurner.sol";

contract HomeBridgeErcToErcWithFeeV2 is HomeBridgeErcToErcWithFee {
    IMinterBurner public minter;

    function setMinter(IMinterBurner _minter) external onlyOwner {
        minter = _minter;
    }

    function onExecuteAffirmation(address _recipient, uint256 _value) internal returns(bool) {
        setTotalExecutedPerDay(getCurrentDay(), totalExecutedPerDay(getCurrentDay()).add(_value));

        uint256 fee = depositFee(_value);
        if (_value <= fee) {
            minter.mint(feeReceiver(), _value);
            return true;
        }

        if (fee != 0) {
            minter.mint(feeReceiver(), fee);
        }

        uint256 value = _value.sub(fee);
        if (value != 0) {
            minter.mint(_recipient, value);
        }

        return true;
    }

    function callToken(bytes data) external payable onlyOwner returns (bool) {
        revert("Deprecated");
        return false;
    }
}
