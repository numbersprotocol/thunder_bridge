# Deploy ERC677

1. npm install
2. truffle compile
3. copy .env.example to .env
4. fill right the value in .env below

```env
DEPLOYMENT_ACCOUNT_PRIVATE_KEY=

BRIDGEABLE_TOKEN_NAME="Name"
BRIDGEABLE_TOKEN_SYMBOL="Symbol"
BRIDGEABLE_TOKEN_DECIMALS="18"

HOME_RPC_URL=http://127.0.0.1:9745
```

5. node deployErc677.js, the contract address will print in the screen
6. use truffle to mint token