const env = require("../src/loadEnv");
const { deployErc677MultiplBridgeTokenNoMint } = require("../src/utils/deployERC20Token");


async function main() {
    await deployErc677MultiplBridgeTokenNoMint('HOME');
}

main().catch(e => console.log('error: ', e));

