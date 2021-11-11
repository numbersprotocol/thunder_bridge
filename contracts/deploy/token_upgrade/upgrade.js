require('dotenv').config()
const { assert } = require('chai')
const Web3 = require('web3')

const BridgeToken = require('../../build/contracts/ERC677BridgeToken.json')
const ERC677InitializableBridgeToken = require('../../build/contracts/ERC677InitializableBridgeToken.json')
const ERC677MultiBridgeToken = require('../../build/contracts/ERC677MultiBridgeToken.json')
const HomeBridgeErcToErcWithFee = require('../../build/contracts/HomeBridgeNativeToErcWithFee.json')
const ForeignBridgeERc677ToNativeV2 = require('../../build/contracts/ForeignBridgeErc677ToErc677V2.json')
const ForeignBridgeErc677ToErc677V2 = require('../../build/contracts/ForeignBridgeErc677ToErc677V2.json')
const TokenProxy = require('../../build/contracts/TokenProxy.json')

const {
  PROXY_ADDRESS,
  RPC_URL,
  CHAIN,
  BRIDGE_MODE,
  DEPLOYMENT_PRIVATE_KEY,
  ADMIN_PRIVATE_KEY,
  BRIDGE_ADDRESS,
  BRIDGE_OWNER_PRIVATE_KEY
} = process.env

const web3 = new Web3(new Web3.providers.HttpProvider(RPC_URL))
const deployer = web3.eth.accounts.privateKeyToAccount(`0x${DEPLOYMENT_PRIVATE_KEY}`)
const admin = web3.eth.accounts.privateKeyToAccount(`0x${ADMIN_PRIVATE_KEY}`)
const bridgeOwner = web3.eth.accounts.privateKeyToAccount(`0x${BRIDGE_OWNER_PRIVATE_KEY}`)
let tokenContract = new web3.eth.Contract(BridgeToken.abi, PROXY_ADDRESS)
let proxyContract = new web3.eth.Contract(TokenProxy.abi, PROXY_ADDRESS)
let bridgeContractABI
let bridgeContract
let newTokenAbi

if (CHAIN === 'HOME') {
  if (BRIDGE_MODE === 'ERC_TO_NATIVE') {
    throw new Error(`No Bridge token in ${BRIDGE_MODE} mode`)
  }
  if (BRIDGE_MODE === 'ERC677_TO_ERC677') {
    newTokenAbi = ERC677MultiBridgeToken
  } else {
    newTokenAbi = ERC677InitializableBridgeToken
  }
  bridgeContractABI = HomeBridgeErcToErcWithFee.abi
} else if (CHAIN === 'FOREIGN') {
  if (BRIDGE_MODE !== 'ERC677_TO_ERC677' && BRIDGE_MODE !== 'ERC_TO_NATIVE') {
    throw new Error(`No Bridge token in ${BRIDGE_MODE} mode`)
  }
  newTokenAbi = ERC677InitializableBridgeToken

  if (BRIDGE_MODE === 'ERC677_TO_ERC677') {
    bridgeContractABI = ForeignBridgeErc677ToErc677V2.abi
  }
  if (BRIDGE_MODE === 'ERC_TO_NATIVE') {
    bridgeContractABI = ForeignBridgeERc677ToNativeV2.abi
  }
} else {
  throw new Error(`Invalid chain ${CHAIN}`)
}

bridgeContract = new web3.eth.Contract(bridgeContractABI, BRIDGE_ADDRESS)

async function main() {
  let symbol = await tokenContract.methods.symbol().call()
  let decimal = await tokenContract.methods.decimals().call()
  let name = await tokenContract.methods.name().call()
  let estimateGas = 0
  let txResult
  let deployment

  console.log(
    `symbol: ${symbol.toString()}, decimal: ${decimal.toString()}, name: ${name.toString()}`
  )

  const newImpl = new web3.eth.Contract(newTokenAbi.abi, { from: deployer.address })
  deployment = await newImpl.deploy({
    data: newTokenAbi.bytecode,
    arguments: [name.toString(), symbol.toString(), decimal.toString()]
  })

  estimateGas = await deployment.estimateGas({ from: deployer.address })
  const deploymentData = await deployment.encodeABI({ from: deployer.address })

  const deploymentTx = await deployer.signTransaction({
    data: deploymentData,
    gas: estimateGas
  })

  txResult = await web3.eth.sendSignedTransaction(deploymentTx.rawTransaction)

  assert.strictEqual(txResult.status, true, 'transaction failed')

  newImpl.options.address = txResult.contractAddress

  console.log(`deploy new token done at ${newImpl.options.address}`)

  let upgradeToData
  let tx

  if (CHAIN !== 'HOME' || BRIDGE_MODE !== 'ERC677_TO_ERC677') {
    console.log(`initialize new token`)

    estimateGas = await newImpl.methods
      .initialize(name.toString(), symbol.toString(), decimal.toString(), deployer.address)
      .estimateGas({ from: deployer.address })

    const initializeData = await newImpl.methods
      .initialize(name.toString(), symbol.toString(), decimal.toString(), deployer.address)
      .encodeABI({ from: deployer.address })

    tx = await deployer.signTransaction({
      data: initializeData,
      to: newImpl.options.address,
      gas: estimateGas
    })

    txResult = await web3.eth.sendSignedTransaction(tx.rawTransaction)
    assert.strictEqual(txResult.status, true, 'transaction failed')
  }

  const implementation = await proxyContract.methods.implementation().call({ from: admin.address })

  console.log(`original implementation is ${implementation}`)

  estimateGas = await proxyContract.methods
    .upgradeTo(newImpl.options.address)
    .estimateGas({ from: admin.address })

  upgradeToData = await proxyContract.methods
    .upgradeTo(newImpl.options.address)
    .encodeABI({ from: admin.address })

  tx = await admin.signTransaction({
    data: upgradeToData,
    to: PROXY_ADDRESS,
    gas: estimateGas
  })

  txResult = await web3.eth.sendSignedTransaction(tx.rawTransaction)

  assert.strictEqual(txResult.status, true, 'transaction failed')

  console.log(`upgrade to new token done`)

  const addBridgeContractData = await newImpl.methods
    .addBridgeContract(BRIDGE_ADDRESS)
    .encodeABI({ from: bridgeOwner.address })

  estimateGas = await bridgeContract.methods
    .callToken(addBridgeContractData)
    .estimateGas({ from: bridgeOwner.address })

  const callTokenData = await bridgeContract.methods
    .callToken(addBridgeContractData)
    .encodeABI({ from: bridgeOwner.address })

  tx = await bridgeOwner.signTransaction({
    data: callTokenData,
    to: BRIDGE_ADDRESS,
    gas: estimateGas
  })

  txResult = await web3.eth.sendSignedTransaction(tx.rawTransaction)

  assert.strictEqual(txResult.status, true, 'transaction failed')

  console.log(`add bridge contract done`)
  console.log(`new bridge token at: ${PROXY_ADDRESS}`)
}

main()
