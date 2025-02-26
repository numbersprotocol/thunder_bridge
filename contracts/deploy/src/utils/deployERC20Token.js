const assert = require('assert')
const Web3Utils = require('web3-utils')
const env = require('../loadEnv')

const {
  deployContract,
  privateKeyToAddress,
  sendRawTxForeign,
  sendRawTxHome
} = require('../deploymentUtils')

const {
  web3Foreign,
  web3Home,
  deploymentPrivateKey,
  FOREIGN_RPC_URL,
  HOME_RPC_URL
} = require('../web3')

const ERC677MultiBridgeToken = require("../../../build/contracts/ERC677MultiBridgeToken.json")

const {
  BRIDGE_MODE,
  DEPLOYMENT_ACCOUNT_PRIVATE_KEY,
  BRIDGEABLE_TOKEN_NAME,
  BRIDGEABLE_TOKEN_SYMBOL,
  BRIDGEABLE_TOKEN_DECIMALS,
  NODE_ENV,
  USER_ADDRESS
} = env

const DEPLOYMENT_ACCOUNT_ADDRESS = privateKeyToAddress(DEPLOYMENT_ACCOUNT_PRIVATE_KEY)

async function mintAddress(erc677token, address, nonce, rpc_url) {
  const mintData = await erc677token.methods
    .mint(address, '10000000000000000000')
    .encodeABI({ from: DEPLOYMENT_ACCOUNT_ADDRESS })

  const txMint = await sendRawTxForeign({
    data: mintData,
    nonce: nonce,
    to: erc677token.options.address,
    privateKey: deploymentPrivateKey,
    url: rpc_url
  })

  assert.strictEqual(Web3Utils.hexToNumber(txMint.status), 1, 'Transaction Failed')
}


async function deployErc677TokenInternal(chain, tokenAbi, noMint) {
  let web3
  let rpc_url

  chain = chain.toUpperCase()

  if (chain === 'HOME') {
    web3 = web3Home
    rpc_url = HOME_RPC_URL
  } else if (chain === 'FOREIGN') {
    web3 = web3Foreign
    rpc_url = FOREIGN_RPC_URL
  }

  let nonce = await web3.eth.getTransactionCount(DEPLOYMENT_ACCOUNT_ADDRESS)
  console.log(`\n[${chain}] deploying ERC677 token`)
  const erc677token = await deployContract(
    tokenAbi,
    [BRIDGEABLE_TOKEN_NAME, BRIDGEABLE_TOKEN_SYMBOL, BRIDGEABLE_TOKEN_DECIMALS],
    { from: DEPLOYMENT_ACCOUNT_ADDRESS, network: chain.toLowerCase(), nonce: nonce }
  )
  nonce++
  console.log(`[${chain}] ERC677 Token: `, erc677token.options.address)

  // only mint foreign token when bridge in, or mint home token when bridge out
  let shouldMint =
    env.BRIDGE_MODE !== 'ERC677_TO_ERC677' ||
    (env.BRIDGE_MODE === 'ERC677_TO_ERC677' && chain == 'HOME') && !noMint

  if (shouldMint) {
    if (NODE_ENV === 'test' && USER_ADDRESS) {
      console.log(`[${chain}] minting 100 tokens to ${USER_ADDRESS} for test`)
      await mintAddress(erc677token, USER_ADDRESS, nonce, rpc_url)
      nonce++
    } else {
      console.log(`[${chain}] minting 100 tokens and transfer them to `, DEPLOYMENT_ACCOUNT_ADDRESS)
      await mintAddress(erc677token, DEPLOYMENT_ACCOUNT_ADDRESS, nonce, rpc_url)
      nonce++
    }
  }

  console.log('\nToken deployment is completed\n')
  return {
    erc677tokenAddress: erc677token.options.address
  }
}

async function deployErc677Token(chain) {
  return deployErc677TokenInternal(chain, ERC677MultiBridgeToken, false);
}

async function deployErc677MultiplBridgeToken(chain) {
  return deployErc677TokenInternal(chain, ERC677MultiBridgeToken, false);
}

async function deployErc677MultiplBridgeTokenNoMint(chain) {
  return deployErc677TokenInternal(chain, ERC677MultiBridgeToken, true);
}

module.exports = {
  deployErc677Token,
  deployErc677MultiplBridgeToken,
  deployErc677MultiplBridgeTokenNoMint
}
