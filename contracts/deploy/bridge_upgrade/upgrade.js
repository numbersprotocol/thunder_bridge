require('dotenv').config()
const { assert } = require('chai')
const Web3 = require('web3')

const ForeignBridgeERC677ToNativeV2 = require('../../build/contracts/ForeignBridgeERC677ToNativeV2.json')
const ForeignBridgeErc677ToErc677V2 = require('../../build/contracts/ForeignBridgeErc677ToErc677V2.json')
const EternalStorageProxy = require('../../build/contracts/EternalStorageProxy.json')

const {
  PROXY_ADDRESS,
  RPC_URL,
  CHAIN,
  BRIDGE_MODE,
  DEPLOYMENT_PRIVATE_KEY,
  ADMIN_PRIVATE_KEY,
  DEPLOYMENT_GAS_PRICE
} = process.env

const web3 = new Web3(new Web3.providers.HttpProvider(RPC_URL))
const deployer = web3.eth.accounts.privateKeyToAccount(`0x${DEPLOYMENT_PRIVATE_KEY}`)
const admin = web3.eth.accounts.privateKeyToAccount(`0x${ADMIN_PRIVATE_KEY}`)
let proxyContract = new web3.eth.Contract(EternalStorageProxy.abi, PROXY_ADDRESS)
let bridgeContract

if (CHAIN === 'HOME') {
  throw new Error('only foreign bridge needs to be upgraded')
} else if (CHAIN === 'FOREIGN') {
  if (BRIDGE_MODE !== 'ERC677_TO_ERC677' && BRIDGE_MODE !== 'ERC_TO_NATIVE') {
    throw new Error(`No Bridge token in ${BRIDGE_MODE} mode`)
  }
  if (BRIDGE_MODE === 'ERC677_TO_ERC677') {
    bridgeContract = ForeignBridgeErc677ToErc677V2
  }
  if (BRIDGE_MODE === 'ERC_TO_NATIVE') {
    bridgeContract = ForeignBridgeERC677ToNativeV2
  }
} else {
  throw new Error(`Invalid chain ${CHAIN}`)
}

async function main() {
  let estimateGas = 0
  let txResult
  let deployment

  const newImpl = new web3.eth.Contract(bridgeContract.abi, { from: deployer.address })
  deployment = await newImpl.deploy({
    data: bridgeContract.bytecode,
    arguments: []
  })

  estimateGas = await deployment.estimateGas({ from: deployer.address })
  const deploymentData = await deployment.encodeABI({ from: deployer.address })

  const deploymentTx = await deployer.signTransaction({
    data: deploymentData,
    gas: estimateGas,
    gasPrice: DEPLOYMENT_GAS_PRICE
  })

  txResult = await web3.eth.sendSignedTransaction(deploymentTx.rawTransaction)

  assert.strictEqual(txResult.status, true, 'transaction failed')

  newImpl.options.address = txResult.contractAddress

  console.log(`deploy new bridge contract done at ${newImpl.options.address}`)

  let version = parseInt(await proxyContract.methods.version().call()) + 1

  console.log(`new version of bridge contract is ${version}`)

  let implementation = await proxyContract.methods.implementation().call()

  console.log(`previous implementation is ${implementation}`)

  estimateGas = await proxyContract.methods
    .upgradeTo(version.toString(), newImpl.options.address)
    .estimateGas({ from: admin.address })

  upgradeToData = await proxyContract.methods
    .upgradeTo(version.toString(), newImpl.options.address)
    .encodeABI({ from: admin.address })

  let tx = await admin.signTransaction({
    data: upgradeToData,
    to: PROXY_ADDRESS,
    gas: estimateGas,
    gasPrice: DEPLOYMENT_GAS_PRICE
  })

  txResult = await web3.eth.sendSignedTransaction(tx.rawTransaction)
  assert.strictEqual(txResult.status, true, 'transaction failed')

  console.log(`upgrade to new bridge done`)
  console.log(`new bridge at: ${PROXY_ADDRESS}`)
}

main()
