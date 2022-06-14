pragma solidity 0.4.24;

import "openzeppelin-eth/contracts/ownership/Ownable.sol";
import "./IFundableBurnableMintableERC677Token.sol";
import "./IMinter.sol";


/*
 * There are three roles.
 * 1. operator: minter, burner
 * 2. superOperator: claimToken, setFundingRules
 * 3. contract owner: add/remove operator, callToken
 */
contract MinterProxy is Ownable {
  address public token;

  mapping(address => bool) public operators;

  uint256 public perMintLimit;
  uint256 public dayLimit;
  mapping(address => uint256) public operatorDayLimit;

  mapping(uint256 => uint256) public totalDaySpent;
  mapping(address => mapping(uint256 => uint256)) operatorDaySpent;

  event PerMintLimitChanged(uint256 prev, uint256 current);
  event OperatorDayLimitChanged(uint256 prev, uint256 current, address operator);
  event DayLimitChanged(uint256 prev, uint256 current);

  modifier isOperator() {
      require(operators[msg.sender] == true);
      _;
  }

  function initialize(address _token, address _bridgeAddress) public initializer {
    Ownable.initialize(msg.sender);

    token = _token;
    operators[_bridgeAddress] = true;
  }

  function minter() view internal returns (IMinter) {
    return IMinter(token);
  }

  // Owner function

  function addOperator(address addr) external onlyOwner {
    operators[addr] = true;
  }

  function removeOperator(address addr) external onlyOwner {
    delete operators[addr];
  }

  function callToken(bytes data) external payable onlyOwner returns (bool) {
    require(token.call.value(msg.value)(data));
    return true;
  }

  function setDayLimit(uint256 amount) external onlyOwner {
    emit DayLimitChanged(dayLimit, amount);
    dayLimit = amount;
  }

  function setPerMintLimit(uint256 amount) external onlyOwner {
    emit PerMintLimitChanged(perMintLimit, amount);
    perMintLimit = amount;
  }

  function setOperatorDayLimit(uint256 amount, address operator) external onlyOwner {
    emit OperatorDayLimitChanged(operatorDayLimit[operator], amount, operator);
    operatorDayLimit[operator] = amount;
  }

  // Operator functions, or co-minter functions.
  function mint(address _to, uint256 _value) public isOperator returns (bool) {
    if (perMintLimit > 0) {
      require(_value < perMintLimit, "Exceed per mint limit");
    }
    if (operatorDayLimit[msg.sender] > 0) {
      require(_value + operatorDaySpent[msg.sender][getCurrentDay()] < operatorDayLimit[msg.sender], "Exceed operator day limit");
    }
    if (dayLimit > 0) {
      require(_value + totalDaySpent[getCurrentDay()] < dayLimit, "Exceed day limit");
    }

    bool res = minter().mint(_to, _value);
    if (res) {
      totalDaySpent[getCurrentDay()] += _value;
      operatorDaySpent[msg.sender][getCurrentDay()] += _value;
    }

    return res;
  }

  // Utility function
  function getCurrentDay() public view returns(uint256) {
    return now / 1 days;
  }
}