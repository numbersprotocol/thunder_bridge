const assert = require('assert')
const Web3Utils = require('web3-utils')
const env = require('../loadEnv')

const { deployContract, privateKeyToAddress, sendRawTxHome } = require('../deploymentUtils')
const { setupHomeBridgeWithFee } = require('./upgradeHomeBridgeWithFee')
const { web3Home, deploymentPrivateKey, HOME_RPC_URL } = require('../web3')

const EternalStorageProxy = require('../../../build/contracts/EternalStorageProxy.json')
const BridgeValidators = require('../../../build/contracts/BridgeValidators.json')
const ERC677InitializableToken = require('../../../build/contracts/ERC677InitializableBridgeToken.json')
const ERC677MultiBridgeToken = require('../../../build/contracts/ERC677MultiBridgeToken.json')
const TokenProxy = require('../../../build/contracts/TokenProxy.json')
const { ZERO_ADDRESS } = require('../constants')
const { deployErc677MultiplBridgeToken } = require('../utils/deployERC20Token')

const VALIDATORS = env.VALIDATORS.split(' ')

let HomeBridge
if (env.BRIDGE_MODE === 'ERC_TO_NATIVE') {
  HomeBridge = require('../../../build/contracts/HomeBridgeNativeToErcWithFee.json')
} else if (env.BRIDGE_MODE === 'ERC677_TO_ERC677') {
  HomeBridge = require('../../../build/contracts/HomeBridgeErc677ToErc677WithFee.json')
} else {
  HomeBridge = require('../../../build/contracts/HomeBridgeErcToErcWithFee.json')
}

const {
  DEPLOYMENT_ACCOUNT_PRIVATE_KEY,
  REQUIRED_NUMBER_OF_VALIDATORS,
  HOME_BRIDGE_OWNER,
  HOME_VALIDATORS_OWNER,
  HOME_UPGRADEABLE_ADMIN,
  HOME_DAILY_LIMIT,
  HOME_MAX_AMOUNT_PER_TX,
  HOME_MIN_AMOUNT_PER_TX,
  HOME_REQUIRED_BLOCK_CONFIRMATIONS,
  HOME_GAS_PRICE,
  BRIDGEABLE_TOKEN_NAME,
  BRIDGEABLE_TOKEN_SYMBOL,
  BRIDGEABLE_TOKEN_DECIMALS,
  FOREIGN_DAILY_LIMIT,
  FOREIGN_MAX_AMOUNT_PER_TX,
  HOME_FEE_PERCENT,
  HOME_FALLBACK_RECIPIENT
} = env

const DEPLOYMENT_ACCOUNT_ADDRESS = privateKeyToAddress(DEPLOYMENT_ACCOUNT_PRIVATE_KEY)

async function deployHome(homeTokenAddress) {
  let homeNonce = await web3Home.eth.getTransactionCount(DEPLOYMENT_ACCOUNT_ADDRESS)
  console.log('deploying storage for home validators')
  const storageValidatorsHome = await deployContract(EternalStorageProxy, [], {
    from: DEPLOYMENT_ACCOUNT_ADDRESS,
    nonce: homeNonce
  })
  console.log('[Home] BridgeValidators Storage: ', storageValidatorsHome.options.address)
  homeNonce++

  console.log('\ndeploying implementation for home validators')
  const bridgeValidatorsHome = await deployContract(BridgeValidators, [], {
    from: DEPLOYMENT_ACCOUNT_ADDRESS,
    nonce: homeNonce
  })
  console.log('[Home] BridgeValidators Implementation: ', bridgeValidatorsHome.options.address)
  homeNonce++

  console.log('\nhooking up eternal storage to BridgeValidators')
  const upgradeToBridgeVHomeData = await storageValidatorsHome.methods
    .upgradeTo('1', bridgeValidatorsHome.options.address)
    .encodeABI({ from: DEPLOYMENT_ACCOUNT_ADDRESS })
  const txUpgradeToBridgeVHome = await sendRawTxHome({
    data: upgradeToBridgeVHomeData,
    nonce: homeNonce,
    to: storageValidatorsHome.options.address,
    privateKey: deploymentPrivateKey,
    url: HOME_RPC_URL
  })
  assert.strictEqual(Web3Utils.hexToNumber(txUpgradeToBridgeVHome.status), 1, 'Transaction Failed')
  homeNonce++

  console.log('\ninitializing Home Bridge Validators with following parameters:\n')
  console.log(
    `REQUIRED_NUMBER_OF_VALIDATORS: ${REQUIRED_NUMBER_OF_VALIDATORS}, VALIDATORS: ${VALIDATORS}`
  )
  bridgeValidatorsHome.options.address = storageValidatorsHome.options.address
  const initializeData = await bridgeValidatorsHome.methods
    .initialize(REQUIRED_NUMBER_OF_VALIDATORS, VALIDATORS, HOME_VALIDATORS_OWNER)
    .encodeABI({ from: DEPLOYMENT_ACCOUNT_ADDRESS })
  const txInitialize = await sendRawTxHome({
    data: initializeData,
    nonce: homeNonce,
    to: bridgeValidatorsHome.options.address,
    privateKey: deploymentPrivateKey,
    url: HOME_RPC_URL
  })
  assert.strictEqual(Web3Utils.hexToNumber(txInitialize.status), 1, 'Transaction Failed')
  homeNonce++

  console.log('transferring proxy ownership to multisig for Validators Proxy contract')
  const proxyDataTransfer = await storageValidatorsHome.methods
    .transferProxyOwnership(HOME_UPGRADEABLE_ADMIN)
    .encodeABI()
  const txProxyDataTransfer = await sendRawTxHome({
    data: proxyDataTransfer,
    nonce: homeNonce,
    to: storageValidatorsHome.options.address,
    privateKey: deploymentPrivateKey,
    url: HOME_RPC_URL
  })
  assert.strictEqual(Web3Utils.hexToNumber(txProxyDataTransfer.status), 1, 'Transaction Failed')
  homeNonce++

  console.log('\ndeploying homeBridge storage\n')
  const homeBridgeStorage = await deployContract(EternalStorageProxy, [], {
    from: DEPLOYMENT_ACCOUNT_ADDRESS,
    nonce: homeNonce
  })
  homeNonce++
  console.log('[Home] HomeBridge Storage: ', homeBridgeStorage.options.address)

  console.log('\ndeploying homeBridge implementation\n')
  const homeBridgeImplementation = await deployContract(HomeBridge, [], {
    from: DEPLOYMENT_ACCOUNT_ADDRESS,
    nonce: homeNonce
  })
  homeNonce++
  console.log('[Home] HomeBridge Implementation: ', homeBridgeImplementation.options.address)

  console.log('\nhooking up HomeBridge storage to HomeBridge implementation')
  const upgradeToHomeBridgeData = await homeBridgeStorage.methods
    .upgradeTo('1', homeBridgeImplementation.options.address)
    .encodeABI({ from: DEPLOYMENT_ACCOUNT_ADDRESS })
  const txUpgradeToHomeBridge = await sendRawTxHome({
    data: upgradeToHomeBridgeData,
    nonce: homeNonce,
    to: homeBridgeStorage.options.address,
    privateKey: deploymentPrivateKey,
    url: HOME_RPC_URL
  })
  assert.strictEqual(Web3Utils.hexToNumber(txUpgradeToHomeBridge.status), 1, 'Transaction Failed')
  homeNonce++

  let initializableToken
  let tokenAddress = homeTokenAddress
  if (env.BRIDGE_MODE === 'ERC677_TO_ERC677' && !tokenAddress) {
    console.log('\nset bridge contract on ERC677BridgeToken')
    let ret = await deployErc677MultiplBridgeToken('HOME')
    tokenAddress = ret.erc677tokenAddress
    homeNonce = await web3Home.eth.getTransactionCount(DEPLOYMENT_ACCOUNT_ADDRESS)
    let token = new web3Home.eth.Contract(ERC677MultiBridgeToken.abi, tokenAddress)
    const addBridgeContractData = await token.methods
      .addBridgeContract(homeBridgeStorage.options.address)
      .encodeABI({ from: DEPLOYMENT_ACCOUNT_ADDRESS })
    const addBridgeContract = await sendRawTxHome({
      data: addBridgeContractData,
      nonce: homeNonce,
      to: tokenAddress,
      privateKey: deploymentPrivateKey,
      url: HOME_RPC_URL
    })
    assert.strictEqual(Web3Utils.hexToNumber(addBridgeContract.status), 1, 'Transaction Failed')
    homeNonce++

    const setBridgeContractData = await token.methods
      .setBridgeContract(homeBridgeStorage.options.address)
      .encodeABI({ from: DEPLOYMENT_ACCOUNT_ADDRESS })
    const setBridgeContract = await sendRawTxHome({
      data: setBridgeContractData,
      nonce: homeNonce,
      to: tokenAddress,
      privateKey: deploymentPrivateKey,
      url: HOME_RPC_URL
    })
    assert.strictEqual(Web3Utils.hexToNumber(setBridgeContract.status), 1, 'Transaction Failed')
    homeNonce++

    console.log('transferring ownership of Bridgeble token to homeBridge contract')
    const txOwnershipData = await token.methods
      .transferOwnership(homeBridgeStorage.options.address)
      .encodeABI({ from: DEPLOYMENT_ACCOUNT_ADDRESS })
    const txOwnership = await sendRawTxHome({
      data: txOwnershipData,
      nonce: homeNonce,
      to: token.options.address,
      privateKey: deploymentPrivateKey,
      url: HOME_RPC_URL
    })
    assert.strictEqual(Web3Utils.hexToNumber(txOwnership.status), 1, 'Transaction Failed')
    homeNonce++
  } else if (env.BRIDGE_MODE !== 'ERC_TO_NATIVE') {
    console.log('\n[Home] deploying initializable token')
    initializableToken = await deployContract(
      ERC677InitializableToken,
      [BRIDGEABLE_TOKEN_NAME, BRIDGEABLE_TOKEN_SYMBOL, BRIDGEABLE_TOKEN_DECIMALS],
      { from: DEPLOYMENT_ACCOUNT_ADDRESS, network: 'home', nonce: homeNonce }
    )
    homeNonce++
    console.log('\n[Home] Initialize token')
    const initializableTokenData = await initializableToken.methods
      .initialize(
        BRIDGEABLE_TOKEN_NAME,
        BRIDGEABLE_TOKEN_SYMBOL,
        BRIDGEABLE_TOKEN_DECIMALS,
        DEPLOYMENT_ACCOUNT_ADDRESS
      )
      .encodeABI({ from: DEPLOYMENT_ACCOUNT_ADDRESS })
    const txInitializeToken = await sendRawTxHome({
      data: initializableTokenData,
      nonce: homeNonce,
      to: initializableToken.options.address,
      privateKey: deploymentPrivateKey,
      url: HOME_RPC_URL
    })
    assert.strictEqual(Web3Utils.hexToNumber(txInitializeToken.status), 1, 'Transaction Failed')
    homeNonce++

    console.log('\n[Home] deploy token proxy')
    const tokenProxy = await deployContract(
      TokenProxy,
      [initializableToken.options.address, HOME_UPGRADEABLE_ADMIN, initializableTokenData],
      { from: DEPLOYMENT_ACCOUNT_ADDRESS, network: 'home', nonce: homeNonce }
    )
    initializableToken.options.address = tokenProxy.options.address
    homeNonce++
    console.log('[Home] Bridgeble Token: ', tokenProxy.options.address)

    console.log('\nset bridge contract on ERC677BridgeToken')
    const setBridgeContractData = await initializableToken.methods
      .setBridgeContract(homeBridgeStorage.options.address)
      .encodeABI({ from: DEPLOYMENT_ACCOUNT_ADDRESS })
    const setBridgeContract = await sendRawTxHome({
      data: setBridgeContractData,
      nonce: homeNonce,
      to: initializableToken.options.address,
      privateKey: deploymentPrivateKey,
      url: HOME_RPC_URL
    })
    assert.strictEqual(Web3Utils.hexToNumber(setBridgeContract.status), 1, 'Transaction Failed')
    homeNonce++

    console.log('add bridge contract on ERC677BridgeToken')
    const addBridgeContractData = await initializableToken.methods
      .addBridgeContract(homeBridgeStorage.options.address)
      .encodeABI({ from: DEPLOYMENT_ACCOUNT_ADDRESS })
    const addBridgeContract = await sendRawTxHome({
      data: addBridgeContractData,
      nonce: homeNonce,
      to: initializableToken.options.address,
      privateKey: deploymentPrivateKey,
      url: HOME_RPC_URL
    })
    assert.strictEqual(Web3Utils.hexToNumber(addBridgeContract.status), 1, 'Transaction Failed')
    homeNonce++

    console.log('transferring ownership of Bridgeble token to homeBridge contract')
    const txOwnershipData = await initializableToken.methods
      .transferOwnership(homeBridgeStorage.options.address)
      .encodeABI({ from: DEPLOYMENT_ACCOUNT_ADDRESS })
    const txOwnership = await sendRawTxHome({
      data: txOwnershipData,
      nonce: homeNonce,
      to: initializableToken.options.address,
      privateKey: deploymentPrivateKey,
      url: HOME_RPC_URL
    })
    assert.strictEqual(Web3Utils.hexToNumber(txOwnership.status), 1, 'Transaction Failed')
    homeNonce++
  }

  console.log('\ninitializing Home Bridge with following parameters:\n')
  console.log(`Home Validators: ${storageValidatorsHome.options.address},
  HOME_DAILY_LIMIT : ${HOME_DAILY_LIMIT} which is ${Web3Utils.fromWei(HOME_DAILY_LIMIT)} in eth,
  HOME_MAX_AMOUNT_PER_TX: ${HOME_MAX_AMOUNT_PER_TX} which is ${Web3Utils.fromWei(
    HOME_MAX_AMOUNT_PER_TX
  )} in eth,
  HOME_MIN_AMOUNT_PER_TX: ${HOME_MIN_AMOUNT_PER_TX} which is ${Web3Utils.fromWei(
    HOME_MIN_AMOUNT_PER_TX
  )} in eth,
  HOME_GAS_PRICE: ${HOME_GAS_PRICE}, HOME_REQUIRED_BLOCK_CONFIRMATIONS : ${HOME_REQUIRED_BLOCK_CONFIRMATIONS}
  `)
  homeBridgeImplementation.options.address = homeBridgeStorage.options.address
  let initializeHomeBridgeData
  console.log(homeBridgeStorage.options.address)
  if (env.BRIDGE_MODE === 'ERC_TO_NATIVE') {
    initializeHomeBridgeData = await homeBridgeImplementation.methods
      .initialize(
        storageValidatorsHome.options.address,
        HOME_DAILY_LIMIT,
        HOME_MAX_AMOUNT_PER_TX,
        HOME_MIN_AMOUNT_PER_TX,
        HOME_GAS_PRICE,
        HOME_REQUIRED_BLOCK_CONFIRMATIONS,
        ZERO_ADDRESS,
        FOREIGN_DAILY_LIMIT,
        FOREIGN_MAX_AMOUNT_PER_TX,
        HOME_BRIDGE_OWNER,
        HOME_FEE_PERCENT,
        HOME_FALLBACK_RECIPIENT
      )
      .encodeABI({
        from: DEPLOYMENT_ACCOUNT_ADDRESS
      })
  } else if (env.BRIDGE_MODE === 'ERC677_TO_ERC677') {
    initializeHomeBridgeData = await homeBridgeImplementation.methods
      .initialize(
        storageValidatorsHome.options.address,
        HOME_DAILY_LIMIT,
        HOME_MAX_AMOUNT_PER_TX,
        HOME_MIN_AMOUNT_PER_TX,
        HOME_GAS_PRICE,
        HOME_REQUIRED_BLOCK_CONFIRMATIONS,
        tokenAddress,
        FOREIGN_DAILY_LIMIT,
        FOREIGN_MAX_AMOUNT_PER_TX,
        HOME_BRIDGE_OWNER,
        HOME_FEE_PERCENT
      )
      .encodeABI({
        from: DEPLOYMENT_ACCOUNT_ADDRESS
      })
  } else {
    initializeHomeBridgeData = await homeBridgeImplementation.methods
      .initialize(
        storageValidatorsHome.options.address,
        HOME_DAILY_LIMIT,
        HOME_MAX_AMOUNT_PER_TX,
        HOME_MIN_AMOUNT_PER_TX,
        HOME_GAS_PRICE,
        HOME_REQUIRED_BLOCK_CONFIRMATIONS,
        initializableToken.options.address,
        FOREIGN_DAILY_LIMIT,
        FOREIGN_MAX_AMOUNT_PER_TX,
        HOME_BRIDGE_OWNER,
        HOME_FEE_PERCENT
      )
      .encodeABI({
        from: DEPLOYMENT_ACCOUNT_ADDRESS
      })
  }

  const txInitializeHomeBridge = await sendRawTxHome({
    data: initializeHomeBridgeData,
    nonce: homeNonce,
    to: homeBridgeStorage.options.address,
    privateKey: deploymentPrivateKey,
    url: HOME_RPC_URL
  })
  assert.strictEqual(Web3Utils.hexToNumber(txInitializeHomeBridge.status), 1, 'Transaction Failed')
  homeNonce++

  console.log('transferring proxy ownership to multisig for Home bridge Proxy contract')
  const homeBridgeProxyData = await homeBridgeStorage.methods
    .transferProxyOwnership(HOME_UPGRADEABLE_ADMIN)
    .encodeABI()
  const txhomeBridgeProxyData = await sendRawTxHome({
    data: homeBridgeProxyData,
    nonce: homeNonce,
    to: homeBridgeStorage.options.address,
    privateKey: deploymentPrivateKey,
    url: HOME_RPC_URL
  })
  assert.strictEqual(Web3Utils.hexToNumber(txhomeBridgeProxyData.status), 1, 'Transaction Failed')
  homeNonce++

  console.log('\nSetup home bridge with fee')
  await setupHomeBridgeWithFee(homeBridgeStorage.options.address, homeBridgeImplementation)

  console.log('\nHome Deployment Bridge completed\n')

  let homeBridgeTokenAddress

  if (env.BRIDGE_MODE === 'ERC_TO_NATIVE') {
    homeBridgeTokenAddress = homeBridgeStorage.options.address
  } else if (env.BRIDGE_MODE === 'ERC677_TO_ERC677') {
    homeBridgeTokenAddress = tokenAddress
  } else {
    homeBridgeTokenAddress = initializableToken.options.address
  }

  return {
    homeBridge: {
      address: homeBridgeStorage.options.address,
      deployedBlockNumber: Web3Utils.hexToNumber(homeBridgeStorage.deployedBlockNumber)
    },
    erc677: {
      address: homeBridgeTokenAddress
    }
  }
}
module.exports = deployHome
