


pragma solidity 0.4.24;

import "../erc20_to_erc20/HomeBridgeErcToErcWithFee.sol";
import "../DepositWithdrawFeeManager.sol";

contract HomeBridgeErc677ToErc677WithFee is HomeBridgeErcToErcWithFee {
    function getBridgeMode() public pure returns(bytes4 _data) {
        return bytes4(keccak256(abi.encodePacked("erc677-to-erc677-core")));
    }

    function onTokenTransfer(address _from, uint256 _value, bytes _data) external returns(bool) {
        require(msg.sender == address(erc677token()), "Unknown token");
        require(withinLimit(_value), "Transfer limit exceeded.");
        require(_value > withdrawFixedFee(), "Value is less than fee");
        uint256 fee = withdrawFee(_value);
        if (fee != 0) {
            require(erc677token().transfer(feeReceiver(), fee), "failed to transfer fee");
        }
        uint256 value = _value.sub(fee);

        setTotalSpentPerDay(getCurrentDay(), totalSpentPerDay(getCurrentDay()).add(value));
        fireEventOnTokenTransfer(_from, value);
        return true;
    }

    function onExecuteAffirmation(address _recipient, uint256 _value) internal returns(bool) {
        setTotalExecutedPerDay(getCurrentDay(), totalExecutedPerDay(getCurrentDay()).add(_value));

        uint256 fee = depositFee(_value);
        if (_value <= fee) {
            erc677token().transfer(feeReceiver(), _value);
            return true;
        }

        if (fee != 0) {
            erc677token().transfer(feeReceiver(), fee);
        }

        uint256 value = _value.sub(fee);
        if (value != 0) {
            erc677token().transfer(_recipient, value);
        }

        return true;
    }

    function callToken(bytes data) onlyOwner payable external returns (bool) {
        require(erc677token().call.value(msg.value)(data));
        return true;
    }

    function setFeePercent(uint256 _feePercent) public onlyOwner {
        require(false, "Deprecated, see DepositWithdrawFeeManager");
    }
}
