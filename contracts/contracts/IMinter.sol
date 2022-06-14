pragma solidity 0.4.24;

contract IMinter {
  function mint(address _to, uint256 _value) public returns (bool);
}