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

const ERC677BridgeToken = require('../../../build/contracts/ERC677BridgeToken.json')
const ERC20InitializableToken = require('../../../build/contracts/ERC20InitializableToken.json')

const {
  BRIDGE_MODE,
  DEPLOYMENT_ACCOUNT_PRIVATE_KEY,
  BRIDGEABLE_TOKEN_NAME,
  BRIDGEABLE_TOKEN_SYMBOL,
  BRIDGEABLE_TOKEN_DECIMALS,
  BRIDGEABLE_TOKEN_TOTALSUPPLY,
  NODE_ENV,
  USER_ADDRESS
} = env

const DEPLOYMENT_ACCOUNT_ADDRESS = privateKeyToAddress(DEPLOYMENT_ACCOUNT_PRIVATE_KEY)

async function mintAddress(erc677token, address, nonce) {
  const mintData = await erc677token.methods
    .mint(address, '10000000000000000000')
    .encodeABI({ from: DEPLOYMENT_ACCOUNT_ADDRESS })

  const txMint = await sendRawTxForeign({
    data: mintData,
    nonce: nonce,
    to: erc677token.options.address,
    privateKey: deploymentPrivateKey,
    url: FOREIGN_RPC_URL
  })

  assert.strictEqual(Web3Utils.hexToNumber(txMint.status), 1, 'Transaction Failed')
}

async function deployErc677Token() {
  let foreignNonce = await web3Foreign.eth.getTransactionCount(DEPLOYMENT_ACCOUNT_ADDRESS)
  console.log('\n[Foreign] deploying ERC20 token')
  const erc677token = await deployContract(
    ERC677BridgeToken,
    [BRIDGEABLE_TOKEN_NAME, BRIDGEABLE_TOKEN_SYMBOL, BRIDGEABLE_TOKEN_DECIMALS],
    { from: DEPLOYMENT_ACCOUNT_ADDRESS, network: 'foreign', nonce: foreignNonce }
  )
  foreignNonce++
  console.log('[Foreign] ERC20 Token: ', erc677token.options.address)

  // only mint foreign token when bridge in

  if (BRIDGE_MODE !== 'ERC677_TO_ERC20') {
    if (NODE_ENV === 'test' && USER_ADDRESS) {
      console.log(`[Foreign] minting 100 tokens to ${USER_ADDRESS} for test`)
      await mintAddress(erc677token, USER_ADDRESS, foreignNonce)
      foreignNonce++
    } else {
      console.log('[Foreign] minting 100 tokens and transfer them to ', DEPLOYMENT_ACCOUNT_ADDRESS)
      await mintAddress(erc677token, DEPLOYMENT_ACCOUNT_ADDRESS, foreignNonce)
      foreignNonce++
    }
  }

  console.log('\nToken deployment is completed\n')
  return {
    erc677tokenAddress: erc677token.options.address
  }
}

async function deployErc20Token(bridgeContractAddress) {
  let homeNonce = await web3Home.eth.getTransactionCount(DEPLOYMENT_ACCOUNT_ADDRESS)
  console.log('\n[Foreign] deploying ERC20 token')
  const erc20token = await deployContract(
    ERC20InitializableToken,
    [BRIDGEABLE_TOKEN_NAME, BRIDGEABLE_TOKEN_SYMBOL, BRIDGEABLE_TOKEN_DECIMALS],
    { from: DEPLOYMENT_ACCOUNT_ADDRESS, network: 'home', nonce: homeNonce }
  )
  homeNonce++
  console.log('[Foreign] ERC20 Token: ', erc20token.options.address)

  const initializableTokenData = await erc20token.methods
    .initialize(
      BRIDGEABLE_TOKEN_NAME,
      BRIDGEABLE_TOKEN_SYMBOL,
      BRIDGEABLE_TOKEN_DECIMALS,
      DEPLOYMENT_ACCOUNT_ADDRESS
    )
    .encodeABI({ from: DEPLOYMENT_ACCOUNT_ADDRESS })

  const txInitializableToken = await sendRawTxHome({
    data: initializableTokenData,
    nonce: homeNonce,
    to: erc20token.options.address,
    privateKey: deploymentPrivateKey,
    url: HOME_RPC_URL
  })

  assert.strictEqual(Web3Utils.hexToNumber(txInitializableToken.status), 1, 'Transaction Failed')

  homeNonce++

  const mintData = await erc20token.methods
    .mint(DEPLOYMENT_ACCOUNT_ADDRESS, BRIDGEABLE_TOKEN_TOTALSUPPLY)
    .encodeABI({ from: DEPLOYMENT_ACCOUNT_ADDRESS })

  const txMintData = await sendRawTxHome({
    data: mintData,
    nonce: homeNonce,
    to: erc20token.options.address,
    privateKey: deploymentPrivateKey,
    url: HOME_RPC_URL
  })

  assert.strictEqual(Web3Utils.hexToNumber(txMintData.status), 1, 'Transaction Failed')

  homeNonce++

  const setBridgeContractData = await erc20token.methods
    .setBridgeContract(bridgeContractAddress)
    .encodeABI({ from: DEPLOYMENT_ACCOUNT_ADDRESS })

  const txSetBridgeContractData = await sendRawTxHome({
    data: setBridgeContractData,
    nonce: homeNonce,
    to: erc20token.options.address,
    privateKey: deploymentPrivateKey,
    url: HOME_RPC_URL
  })

  assert.strictEqual(Web3Utils.hexToNumber(txSetBridgeContractData.status), 1, 'Transaction Failed')

  console.log('\nToken deployment is completed\n')

  homeNonce++

  return {
    erc20tokenAddress: erc20token.options.address,
    homeNonce
  }
}

module.exports = { deployErc677Token, deployErc20Token }
