pragma solidity 0.4.24;

import "openzeppelin-eth/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-eth/contracts/token/ERC20/ERC20Detailed.sol";
import "openzeppelin-eth/contracts/ownership/Ownable.sol";
import "zos-lib/contracts/Initializable.sol";

contract ERC20InitializableToken is ERC20, ERC20Detailed, Ownable {
    event ContractFallbackCallFailed(address from, address to, uint value);

    address public bridgeContract;
    bool private _minted;

    uint256 lastFundingPeriod = 0;
    uint256 totalPeriodFundedAmount = 0;

    FundingRules fundingRules;

    struct FundingRules {
        uint256 periodLength; // refresh period for next funding round in blocks
        uint256 maxPeriodFunds; // max amount to fund in a period
        uint256 threshold; // amount below which a funding event happens
        uint256 amount; // amount to fund
    }

    function initialize(string _name, string _symbol, uint8 _decimals, address _owner) external initializer {
        Ownable.initialize(_owner);
        ERC20Detailed.initialize(_name, _symbol, _decimals);
    }

    function () payable public {}

    function setFundingRules(uint256 _periodLength, uint256 _maxPeriodFunds, uint256 _threshold, uint256 _amount) onlyOwner public {
        fundingRules.periodLength = _periodLength;
        fundingRules.maxPeriodFunds = _maxPeriodFunds;
        fundingRules.threshold = _threshold;
        fundingRules.amount = _amount;
    }

    function getFundingRules() public view returns(uint256, uint256, uint256, uint256){
        return (fundingRules.periodLength,
        fundingRules.maxPeriodFunds,
        fundingRules.threshold,
        fundingRules.amount);
    }

    function fundReceiver(address _to) internal {
        // reset funding period
        if(block.number > fundingRules.periodLength + lastFundingPeriod) {
            lastFundingPeriod = block.number;
            totalPeriodFundedAmount = 0;
        }
        // transfer receiver money only if limits are not met and they are below the threshold
        if(address(_to).balance < fundingRules.threshold && fundingRules.amount + totalPeriodFundedAmount <= fundingRules.maxPeriodFunds) {
            if(address(_to).send(fundingRules.amount)){
                totalPeriodFundedAmount += fundingRules.amount;
            }
        }
    }

    function setBridgeContract(address _bridgeContract) onlyOwner public {
        require(_bridgeContract != address(0) && isContract(_bridgeContract));
        bridgeContract = _bridgeContract;
    }

    function mint(address _to, uint256 _totalSupply) onlyOwner public {
        require(!_minted && _to != address(0));
        _minted = true;
        _mint(_to, _totalSupply);
    }

    function superTransfer(address _to, uint256 _value) internal returns (bool) {
        return super.transfer(_to, _value);
    }

    function transfer(address _to, uint256 _value) public returns (bool) {
        require(superTransfer(_to, _value), "failed superTransfer");
        fundReceiver(_to);
        if (isContract(_to) && !contractFallback(_to, _value, new bytes(0))) {
            if (_to == bridgeContract) {
                revert("revert here");
            } else {
                emit ContractFallbackCallFailed(msg.sender, _to, _value);
            }
        }
        return true;
    }

    function contractFallback(address _to, uint256 _value, bytes _data) private returns (bool) {
        return _to.call(abi.encodeWithSignature("onTokenTransfer(address,uint256,bytes)",  msg.sender, _value, _data));
    }

    function isContract(address _addr) private view returns (bool) {
        uint length;
        assembly { length := extcodesize(_addr) }
        return length > 0;
    }
}