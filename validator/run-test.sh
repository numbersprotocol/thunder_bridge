#!/bin/bash

main() {
    export BRIDGE_MODE=ERC_TO_ERC
    export QUEUE_URL=amqp://rabbit
    export REDIS_URL=redis://redis
    export HOME_RPC_URL=http://parity1:8545
    export FOREIGN_RPC_URL=http://parity3:8545
    export HOME_BRIDGE_ADDRESS=0x1feB40aD9420b186F019A717c37f5546165d411E
    export FOREIGN_BRIDGE_ADDRESS=0x4a58D6d8D416a5fBCAcf3dC52eb8bE8948E25127
    export ERC20_TOKEN_ADDRESS=0x3C665A31199694Bf723fD08844AD290207B5797f
    export BRIDGEABLE_TOKEN_ADDRESS=0x792455a6bCb62Ed4C4362D323E0590654CA4765c
    export VALIDATOR_ADDRESS=0xaaB52d66283F7A1D5978bcFcB55721ACB467384b
    export VALIDATOR_ADDRESS_PRIVATE_KEY=8e829f695aed89a154550f30262f1529582cc49dc30eff74a6b491359e0230f9
    export REDIS_LOCK_TTL=1000
    export HOME_GAS_PRICE_ORACLE_URL=https://gasprice.poa.network/
    export HOME_GAS_PRICE_SPEED_TYPE=standard
    export HOME_GAS_PRICE_FALLBACK=1000000000
    export HOME_GAS_PRICE_UPDATE_INTERVAL=600000
    export FOREIGN_GAS_PRICE_ORACLE_URL=https://gasprice.poa.network/
    export FOREIGN_GAS_PRICE_SPEED_TYPE=standard
    export FOREIGN_GAS_PRICE_FALLBACK=10000000000
    export FOREIGN_GAS_PRICE_UPDATE_INTERVAL=600000
    export HOME_POLLING_INTERVAL=500
    export FOREIGN_POLLING_INTERVAL=500
    export ALLOW_HTTP=yes
    npm test
}

main