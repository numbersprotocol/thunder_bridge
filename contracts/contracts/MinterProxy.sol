pragma solidity 0.4.24;

import "openzeppelin-eth/contracts/ownership/Ownable.sol";
import "./IFundableBurnableMintableERC677Token.sol";

contract IMinter {
  function mint(address _to, uint256 _value) public returns (bool);
}

/*
 * There are three roles.
 * 1. operator: minter, burner
 * 2. superOperator: claimToken, setFundingRules
 * 3. contract owner: add/remove operator, callToken
 */
contract MinterProxy is Ownable {
  address public token;

  mapping(address => bool) public operators;

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

  // Operator functions, or co-minter functions.
  function mint(address _to, uint256 _value) public isOperator returns (bool) {
      return minter().mint(_to, _value);
  }
}