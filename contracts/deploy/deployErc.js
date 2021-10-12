const fs = require('fs')

function writeToFile(homeBridge, homeBridgeToken, foreignBridge, foreignBridgeToken) {
  console.log('\nDeployment has been completed.\n\n')
  console.log(
    `[   Home  ] HomeBridge: ${homeBridge.address} at block ${homeBridge.deployedBlockNumber}`
  )
  console.log(`[   Home  ] Home Bridgeable Token: ${homeBridgeToken.address}`)
  console.log(
    `[ Foreign ] ForeignBridge: ${foreignBridge.address} at block ${foreignBridge.deployedBlockNumber}`
  )
  console.log(`[ Foreign ] Foreign Token: ${foreignBridgeToken.address}`)
  if (!fs.existsSync('data')) fs.mkdirSync('data', { recursive: true })
  fs.writeFileSync(
    'data/deployed.json',
    JSON.stringify(
      {
        homeBridge: {
          ...homeBridge,
          erc677: homeBridgeToken
        },
        foreignBridge: {
          ...foreignBridge
        },
        erc20Token: foreignBridgeToken
      },
      null,
      4
    )
  )
  console.log('Contracts Deployment have been saved to `data/deployed.json`')
}

async function deployErc677ToErc677(foreignTokenAddress, homeTokenAddress) {
  const deployHome = require('./src/erc_to_erc/home')
  const deployForeign = require('./src/erc_to_erc/foreign')

  // TODO: refactor object key later
  const { homeBridge, erc677 } = await deployHome(homeTokenAddress)
  const { foreignBridge, erc20Token } = await deployForeign(foreignTokenAddress)

  writeToFile(homeBridge, erc677, foreignBridge, erc20Token)
}

async function deployErcToErc(foreignTokenAddress) {
  const deployHome = require('./src/erc_to_erc/home')
  const deployForeign = require('./src/erc_to_erc/foreign')

  const { homeBridge, erc677 } = await deployHome('')
  const { foreignBridge, erc20Token } = await deployForeign(foreignTokenAddress)

  writeToFile(homeBridge, erc677, foreignBridge, erc20Token)
}

module.exports = {
  deployErcToErc,
  deployErc677ToErc677
}
