pragma solidity 0.4.24;

import "./ERC677MultiBridgeToken.sol";


contract ERC677MultiBridgeTokenV2 is ERC677MultiBridgeToken {
    function burnFrom(address _who, uint256 _amount) public onlyOwner {
        _burn(_who, _amount);
    }
}