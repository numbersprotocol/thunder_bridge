# How to deploy ERC677

1. npm install
2. truffle compile
3. copy .env.example to ../.env
4. fill right the value below in ../.env

```env
DEPLOYMENT_ACCOUNT_PRIVATE_KEY=

BRIDGEABLE_TOKEN_NAME="Name"
BRIDGEABLE_TOKEN_SYMBOL="Symbol"
BRIDGEABLE_TOKEN_DECIMALS="18"

HOME_RPC_URL=
```

5. run `node deployErc677.js`, the contract address will print in the screen
6. use truffle to mint token

## Truffle

if you're using ganache, just execute `truffle console --network test`, otherwise you need to create a .private-keys file
and each line is a private of some account, like

```
5309979b8a0efeec6db81d041e7afcdcf7d0171be80d757bb4afcaf100da9f0e
55b70f2fce8f78dfec148b235840dc3635f48417e859ce26ac1114f43dffb2e9
```

after that, use `truffle console --network thunder-mainnet` or `truffle console --network thunder-testnet` to connect to thunder chain

in truffle console
```
> global = this # if global is not defined, you can start with next command first

> token = await ERC677MultiBridgeToken.at('ADDRESS') # instance token

> await token.address # check if token instance is good

> await token.mint('ADDRESS', web3.utils.toWei('100'), {from: 'ADDRESS_OF_TOKEN_OWNER'}) # the private key ADDRESS_OF_TOKEN_OWNER should be in .private-keys file

> (await token.balanceOf('ADDRESS')).toString() # check if mint is good

> (await token.burn(web3.utils.toWei('1'), {from: 'ADDRESS'})) # burn 1 token

> (await token.balanceOf('ADDRESS')).toString() # check if burn is good

> await token.mint('ADDRESS', web3.utils.toWei('100'), {from: 'ADDRESS_THAT_NOT_OWNED_TOKEN'}) # should be reverted

> await token.addBridgeContract('BRIDGE_ADDRESS', {from: 'ADDRESS_OF_TOKEN_OWNER'})
# if it is allowed to call bridge contract via token.transfer, you should add the bridge contract address, see thunder_bridge/contracts/contracts/ERC677MultiBridgeToken.sol, function addBridgeContract and transfer
```

## Things need to be checked

1. can only mint by the deployment account
2. can burn without issue