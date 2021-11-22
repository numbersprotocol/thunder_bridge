const POA20 = artifacts.require("ERC677MultiBridgeToken.sol");
const ERC677ReceiverTest = artifacts.require("ERC677ReceiverTest.sol")
const ERC677MultiBridgeToken = artifacts.require("ERC677MultiBridgeToken.sol")
const AlwaysFail = artifacts.require("AlwaysFail.sol")

const { expect } = require('chai')
const { ERROR_MSG, ERROR_MSG_OPCODE, ZERO_ADDRESS, BN } = require('./setup')
const { ether, expectEventInLogs } = require('./helpers/helpers')

const Web3Utils = require('web3-utils');
const HomeErcToErcBridge = artifacts.require("HomeBridgeErcToErc.sol");
const ForeignBridgeErcToErc = artifacts.require("ForeignBridgeErcToErc.sol");
const BridgeValidators = artifacts.require("BridgeValidators.sol");
const minPerTx = ether('0.01')
const requireBlockConfirmations = 8;
const gasPrice = Web3Utils.toWei('1', 'gwei');
const oneEther = ether('1')
const halfEther = ether('0.5')
const executionDailyLimit = oneEther
const executionMaxPerTx = halfEther
const ZERO = new BN(0)

const ERC677InitialToken  = artifacts.require("ERC677InitializableBridgeToken.sol");
const TokenProxy = artifacts.require("TokenProxy.sol");

contract('ERC677MultiBridgeToken', async (accounts) => {
  let token;
  let owner = accounts[0];
  const user = accounts[1];
  beforeEach(async () => {
    token = await ERC677MultiBridgeToken.new('ERC677', 'MBT', 18);
  });
  it('cannot add zero bridge contract', async () => {
    await token.addBridgeContract(ZERO_ADDRESS).should.be.rejectedWith(ERROR_MSG);
  });

  it('can add bridge contract', async () => {
    let bridge = await HomeErcToErcBridge.new();
    await token.addBridgeContract(bridge.address).should.be.fulfilled;
  })

  it('can check if is bridge contract', async () => {
    let bridge = await HomeErcToErcBridge.new();
    await token.addBridgeContract(bridge.address);

    expect(await token.isBridgeContract(bridge.address)).to.be.equal(true);
  })

  it('can add&check multiple bridge contract', async () => {
    let bridge = await HomeErcToErcBridge.new();
    let bridge2 = await HomeErcToErcBridge.new();
    await token.addBridgeContract(bridge.address);
    await token.addBridgeContract(bridge2.address).should.be.fulfilled;

    expect(await token.isBridgeContract(bridge.address)).to.be.equal(true);
    expect(await token.isBridgeContract(bridge2.address)).to.be.equal(true);
    expect(await token.isBridgeContract('0xaaB52d66283F7A1D5978bcFcB55721ACB467384b')).to.be.equal(false);
  })

  it('should revert here when transfer failed', async () => {
    let bridge = await AlwaysFail.new();

    token.mint(owner, ether('10'));
    await token.addBridgeContract(bridge.address);

    await token.transfer(bridge.address, ether('0.1')).should.be.rejectedWith(ERROR_MSG);
  });

  it('should not revert due to unknown bridge', async () => {
    let bridge = await AlwaysFail.new();

    token.mint(owner, ether('10'));
    await token.transfer(bridge.address, ether('0.1')).should.be.fulfilled;
  });

  it('cannot mint by non onwer', async () => {
    await token.mint(owner, ether('10'), {from: user}).should.be.rejectedWith(ERROR_MSG);
  })

  it('can burn users own token', async () => {
    await token.mint(user, ether('1'));
    await token.burn(ether('1'), {from: user}).should.be.fulfilled;
  })

  it("should not trigger onTokenTransfer for untrusted contract when transfer", async () => {
    let bridge = await AlwaysFail.new();

    await token.mint(owner, ether('10'));
    await token.transfer(bridge.address, ether('0.1')).should.be.fulfilled
    expect(await token.balanceOf(bridge.address)).to.be.bignumber.equal(web3.utils.toWei("0.1"))
  })

  it("should trigger onTokenTransfer and reverted when transferAndCall for trusted contract failed", async () => {
    let bridge = await AlwaysFail.new();

    await token.mint(owner, ether('10'));
    await token.addBridgeContract(bridge.address);
    await token.transferAndCall(bridge.address, ether('0.1'), '0x').should.be.rejectedWith(ERROR_MSG);
  })
  it("should not trigger onTokenTransfer for untrusted contract when transferAndCall", async () => {
    let bridge = await AlwaysFail.new();

    await token.mint(owner, ether('10'));
    await token.transferAndCall(bridge.address, ether('0.1'), '0x').should.be.fulfilled;
  })
});

contract("ERC677InitializableBridgeToken", async (accounts) => {
  let token
  let owner = accounts[0];
  const user = accounts[1];
  beforeEach(async () => {
    token = await ERC677InitialToken.new();
    await token.initialize("Bridge Token", "WT", 18, owner)
  });
  it('can set token attribute', async () => {
    expect(await token.symbol()).to.be.equal("WT");
    expect(await token.decimals()).to.be.bignumber.equal('18');
    expect(await token.name()).to.be.equal('Bridge Token');
    expect(await token.totalSupply()).to.be.bignumber.equal(ZERO);
  });

  it('can set bridge contract', async () => {
    const homeErcToErcContract = await HomeErcToErcBridge.new();
    expect(await token.isBridgeContract(homeErcToErcContract.address)).to.be.equal(false);
    await token.addBridgeContract(homeErcToErcContract.address).should.be.fulfilled;
    expect(await token.isBridgeContract(homeErcToErcContract.address)).to.be.equal(true);
  });

  it('can remove bridge contract', async () => {
    const homeErcToErcContract = await HomeErcToErcBridge.new();
    expect(await token.isBridgeContract(homeErcToErcContract.address)).to.be.equal(false);
    await token.addBridgeContract(homeErcToErcContract.address).should.be.fulfilled;
    expect(await token.isBridgeContract(homeErcToErcContract.address)).to.be.equal(true);
    await token.removeBridgeContract(homeErcToErcContract.address).should.be.fulfilled;
    expect(await token.isBridgeContract(homeErcToErcContract.address)).to.be.equal(false);
  });

  it("should not trigger onTokenTransfer for untrusted contract when transfer", async () => {
    let bridge = await AlwaysFail.new();

    token.mint(owner, ether('10'));
    await token.transfer(bridge.address, ether('0.1')).should.be.fulfilled
    expect(await token.balanceOf(bridge.address)).to.be.bignumber.equal(web3.utils.toWei("0.1"))
  })

  it("should trigger onTokenTransfer when transferAndCall", async () => {
    let bridge = await AlwaysFail.new();

    token.mint(owner, ether('10'));
    await token.addBridgeContract(bridge.address);
    await token.transferAndCall(bridge.address, ether('0.1'), '0x').should.be.rejectedWith(ERROR_MSG)
  })

  it("should trigger onTokenTransfer and reverted when transferAndCall for trusted contract failed", async () => {
    let bridge = await AlwaysFail.new();

    await token.mint(owner, ether('10'));
    await token.addBridgeContract(bridge.address);
    await token.transferAndCall(bridge.address, ether('0.1'), '0x').should.be.rejectedWith(ERROR_MSG);
  })

  it("should not trigger onTokenTransfer for untrusted contract when transferAndCall", async () => {
    let bridge = await AlwaysFail.new();

    await token.mint(owner, ether('10'));
    await token.transferAndCall(bridge.address, ether('0.1'), '0x').should.be.fulfilled;
  })
})

contract('ERC677BridgeToken', async (accounts) => {
  let token
  let owner = accounts[0]
  const user = accounts[1];
  beforeEach(async () => {
    token = await POA20.new("POA ERC20 Foundation", "POA20", 18);
  })
  it('default values', async () => {
    expect(await token.symbol()).to.be.equal('POA20')
    expect(await token.decimals()).to.be.bignumber.equal('18')
    expect(await token.name()).to.be.equal('POA ERC20 Foundation')
    expect(await token.totalSupply()).to.be.bignumber.equal(ZERO)
    expect(await token.mintingFinished()).to.be.equal(false)

    const { major, minor, patch } = await token.getTokenInterfacesVersion()
    expect(major).to.be.bignumber.gte(ZERO)
    expect(minor).to.be.bignumber.gte(ZERO)
    expect(patch).to.be.bignumber.gte(ZERO)
  })

  describe("#TokenProxy", async() => {
    it('can use a proxy', async() => {
      const homeTokenImpl = await ERC677InitialToken.new("Implv1", "IMPLv1", 18);
      const contract = new web3.eth.Contract(homeTokenImpl.abi, homeTokenImpl.address);
      let owner = accounts[0];
      let contractOwner = accounts[1];
      let ordinary = accounts[6];
      let ordinary2 = accounts[5];
      let data = contract.methods.initialize("TT-Bitcoin", "TT-BTC", 18, contractOwner).encodeABI();
      const homeTokenProxy = await TokenProxy.new(homeTokenImpl.address, owner, data);
      const homeToken = await ERC677InitialToken.at(homeTokenProxy.address);
      const name = await homeToken.name({from: ordinary});
      const symbol = await homeToken.symbol({from: ordinary});
      const decimals = await homeToken.decimals({from: ordinary});
      name.should.be.equal("TT-Bitcoin");
      symbol.should.be.equal("TT-BTC");
      decimals.should.be.bignumber.equal(web3.utils.toBN(18));
      await homeToken.mint(ordinary, oneEther, {from: contractOwner});
      await homeToken.transfer(ordinary2, halfEther, {from: ordinary});
      const firstBalance = await homeToken.balanceOf(ordinary,{from: ordinary});
      const secondBalance = await homeToken.balanceOf(ordinary2,{from: ordinary});
      firstBalance.should.be.bignumber.equal(secondBalance);
      firstBalance.should.be.bignumber.equal(halfEther);
    })
  })

  describe('#bridgeContract', async() => {
    it('can set bridge contract', async () => {
      const homeErcToErcContract = await HomeErcToErcBridge.new();
      expect(await token.isBridgeContract(homeErcToErcContract.address)).to.be.equal(false);
      await token.addBridgeContract(homeErcToErcContract.address).should.be.fulfilled;
      expect(await token.isBridgeContract(homeErcToErcContract.address)).to.be.equal(true);
    })

    it('only owner can set bridge contract', async () => {
      const homeErcToErcContract = await HomeErcToErcBridge.new();
      expect(await token.isBridgeContract(homeErcToErcContract.address)).to.be.equal(false);

      await token.addBridgeContract(homeErcToErcContract.address, {from: user }).should.be.rejectedWith(ERROR_MSG);
      expect(await token.isBridgeContract(homeErcToErcContract.address)).to.be.equal(false);

      await token.addBridgeContract(homeErcToErcContract.address, {from: owner }).should.be.fulfilled;
      expect(await token.isBridgeContract(homeErcToErcContract.address)).to.be.equal(true);
    })

    it('fail to set invalid bridge contract address', async () => {
      const invalidContractAddress = '0xaaB52d66283F7A1D5978bcFcB55721ACB467384b';
      expect(await token.isBridgeContract(invalidContractAddress)).to.be.equal(false);

      await token.addBridgeContract(invalidContractAddress).should.be.rejectedWith(ERROR_MSG);
      expect(await token.isBridgeContract(invalidContractAddress)).to.be.equal(false);

      await token.addBridgeContract(ZERO_ADDRESS).should.be.rejectedWith(ERROR_MSG);
      expect(await token.isBridgeContract(ZERO_ADDRESS)).to.be.equal(false);
    })
  })

  describe('#mint', async() => {
    it('can mint by owner', async () => {
      expect(await token.totalSupply()).to.be.bignumber.equal(ZERO)
      await token.mint(user, 1, { from: owner }).should.be.fulfilled
      expect(await token.totalSupply()).to.be.bignumber.equal('1')
      expect(await token.balanceOf(user)).to.be.bignumber.equal('1')
    })

    it('no one can call finishMinting', async () => {
      await token.finishMinting().should.be.rejectedWith(ERROR_MSG)
    })

    it('cannot mint by non-owner', async () => {
      expect(await token.totalSupply()).to.be.bignumber.equal(ZERO)
      await token.mint(user, 1, { from: user }).should.be.rejectedWith(ERROR_MSG)
      expect(await token.totalSupply()).to.be.bignumber.equal(ZERO)
      expect(await token.balanceOf(user)).to.be.bignumber.equal(ZERO)
    })
  })

  describe('#transfer', async() => {
    let homeErcToErcContract, foreignErcToErcContract, validatorContract
    beforeEach(async () => {
      validatorContract = await BridgeValidators.new()
      const authorities = [accounts[2]];
      const feePercent = '0';
      await validatorContract.initialize(1, authorities, owner)
      homeErcToErcContract = await HomeErcToErcBridge.new()
      await homeErcToErcContract.initialize(validatorContract.address, oneEther, halfEther, minPerTx, gasPrice, requireBlockConfirmations, token.address, executionDailyLimit, executionMaxPerTx, owner, feePercent)
      foreignErcToErcContract = await ForeignBridgeErcToErc.new()
      await foreignErcToErcContract.initialize(
        validatorContract.address,
        token.address,
        requireBlockConfirmations,
        gasPrice,
        executionMaxPerTx,
        executionDailyLimit,
        executionMaxPerTx,
        owner,
        feePercent
      );
    });
    it('sends tokens to recipient', async () => {
      await token.mint(user, 1, {from: owner }).should.be.fulfilled;
      await token.transfer(user, 1, {from: owner}).should.be.rejectedWith(ERROR_MSG);
      const {logs} = await token.transfer(owner, 1, {from: user}).should.be.fulfilled;

      expect(await token.balanceOf(owner)).to.be.bignumber.equal('1')
      expect(await token.balanceOf(user)).to.be.bignumber.equal(ZERO)
      expectEventInLogs(logs, 'Transfer', {
        from: user,
        to: owner,
        value: new BN(1)
      })
    })

    it('sends tokens to bridge contract', async () => {
      await token.addBridgeContract(homeErcToErcContract.address).should.be.fulfilled;
      await token.mint(user, web3.utils.toWei('1', "ether"), {from: owner }).should.be.fulfilled;

      const result = await token.transfer(homeErcToErcContract.address, minPerTx, {from: user}).should.be.fulfilled;
      expectEventInLogs(result.logs, 'Transfer', {
        from: user,
        to: homeErcToErcContract.address,
        value: minPerTx
      })
    })

    it('sends tokens to contract that does not contains onTokenTransfer method', async () => {
      await token.addBridgeContract(homeErcToErcContract.address).should.be.fulfilled;
      await token.mint(user, web3.utils.toWei('1', "ether"), {from: owner }).should.be.fulfilled;

      const result = await token.transfer(validatorContract.address, minPerTx, {from: user}).should.be.fulfilled;
      expectEventInLogs(result.logs, 'Transfer', {
        from: user,
        to: validatorContract.address,
        value: minPerTx
      })
    })

    it('fail to send tokens to bridge contract out of limits', async () => {
      const lessThanMin = web3.utils.toBN(web3.utils.toWei('0.0001', "ether"))
      await token.mint(user, web3.utils.toWei('1', "ether"), {from: owner }).should.be.fulfilled;

      await token.addBridgeContract(homeErcToErcContract.address).should.be.fulfilled;
      await token.transfer(homeErcToErcContract.address, lessThanMin, {from: user}).should.be.rejectedWith(ERROR_MSG);

      await token.addBridgeContract(foreignErcToErcContract.address).should.be.fulfilled;
      await token.transfer(foreignErcToErcContract.address, lessThanMin, {from: user}).should.be.rejectedWith(ERROR_MSG);
    })
  })

  describe("#burn", async () => {
    it('can burn', async() => {
      await token.burn(100, { from: owner }).should.be.rejectedWith(ERROR_MSG)
      await token.mint(user, 1, { from: owner }).should.be.fulfilled
      await token.burn(1, { from: user }).should.be.fulfilled
      expect(await token.totalSupply()).to.be.bignumber.equal(ZERO)
      expect(await token.balanceOf(user)).to.be.bignumber.equal(ZERO)
    })
  })

  describe('#transferAndCall', () => {
    let homeErcToErcContract, foreignErcToErcContract, validatorContract
    beforeEach(async () => {
      validatorContract = await BridgeValidators.new()
      const authorities = [accounts[2]];
      const feePercent = '0';
      await validatorContract.initialize(1, authorities, owner)
      homeErcToErcContract = await HomeErcToErcBridge.new()
      await homeErcToErcContract.initialize(validatorContract.address, oneEther, halfEther, minPerTx, gasPrice, requireBlockConfirmations, token.address, executionDailyLimit, executionMaxPerTx, owner, feePercent)
      foreignErcToErcContract = await ForeignBridgeErcToErc.new()
      await foreignErcToErcContract.initialize(
        validatorContract.address,
        token.address,
        requireBlockConfirmations,
        gasPrice,
        executionMaxPerTx,
        executionDailyLimit,
        executionMaxPerTx,
        owner,
        feePercent
      );
    })
    it('calls contractFallback', async () => {
      const receiver = await ERC677ReceiverTest.new()
      expect(await receiver.from()).to.be.equal(ZERO_ADDRESS)
      expect(await receiver.value()).to.be.bignumber.equal(ZERO)
      expect(await receiver.data()).to.be.equal(null)
      expect(await receiver.someVar()).to.be.bignumber.equal(ZERO)

      const callDoSomething123 = receiver.contract.methods.doSomething(123).encodeABI()

      await token.mint(user, 1, {from: owner }).should.be.fulfilled;
      await token.addBridgeContract(receiver.address);
      await token.transferAndCall(token.address, '1', callDoSomething123, {from: user}).should.be.rejectedWith(ERROR_MSG);
      await token
        .transferAndCall(ZERO_ADDRESS, '1', callDoSomething123, { from: user })
        .should.be.rejectedWith(ERROR_MSG)
      await token.transferAndCall(receiver.address, '1', callDoSomething123, {from: user}).should.be.fulfilled;

      expect(await token.balanceOf(receiver.address)).to.be.bignumber.equal('1')
      expect(await token.balanceOf(user)).to.be.bignumber.equal(ZERO)
      expect(await receiver.from()).to.be.equal(user)
      expect(await receiver.value()).to.be.bignumber.equal('1')
      expect(await receiver.data()).to.be.equal(callDoSomething123)
      expect(await receiver.someVar()).to.be.bignumber.equal('123')
    })

    it('sends tokens to bridge contract', async () => {
      await token.mint(user, web3.utils.toWei('1', "ether"), {from: owner }).should.be.fulfilled;

      const result = await token.transferAndCall(homeErcToErcContract.address, minPerTx, '0x', {from: user}).should.be.fulfilled;
      expectEventInLogs(result.logs, 'Transfer', {
        from: user,
        to: homeErcToErcContract.address,
        value: minPerTx
      })
    })

    it('fail to sends tokens to contract that does not contains onTokenTransfer method', async () => {
      await token.mint(user, web3.utils.toWei('1', "ether"), {from: owner }).should.be.fulfilled;

      await token.addBridgeContract(validatorContract.address);
      await token.transferAndCall(validatorContract.address, minPerTx, '0x', {from: user}).should.be.rejectedWith(ERROR_MSG);
    })

    it('fail to send tokens to bridge contract out of limits', async () => {
      const lessThanMin = web3.utils.toBN(web3.utils.toWei('0.0001', "ether"))
      await token.mint(user, web3.utils.toWei('1', "ether"), {from: owner }).should.be.fulfilled;

      await token.addBridgeContract(homeErcToErcContract.address).should.be.fulfilled;
      await token.transferAndCall(homeErcToErcContract.address, lessThanMin, '0x', {from: user}).should.be.rejectedWith(ERROR_MSG);

      await token.addBridgeContract(foreignErcToErcContract.address).should.be.fulfilled;
      await token.transferAndCall(foreignErcToErcContract.address, lessThanMin, '0x', {from: user}).should.be.rejectedWith(ERROR_MSG);
    })
  })
  describe('#claimtokens', async () => {
    it('can take send ERC20 tokens', async ()=> {
      const owner = accounts[0];
      const halfEther = web3.utils.toBN(web3.utils.toWei('0.5', "ether"));
      let tokenSecond = await POA20.new("Roman Token", "RST", 18);

      await tokenSecond.mint(accounts[0], halfEther).should.be.fulfilled;
      halfEther.should.be.bignumber.equal(await tokenSecond.balanceOf(accounts[0]))
      await tokenSecond.transfer(token.address, halfEther);
      '0'.should.be.bignumber.equal(await tokenSecond.balanceOf(accounts[0]))
      halfEther.should.be.bignumber.equal(await tokenSecond.balanceOf(token.address))

      await token.claimTokens(tokenSecond.address, accounts[3], {from: owner});
      '0'.should.be.bignumber.equal(await tokenSecond.balanceOf(token.address))
      halfEther.should.be.bignumber.equal(await tokenSecond.balanceOf(accounts[3]))

    })
  })
  describe('#transfer', async () => {
    it('if transfer called on contract, onTokenTransfer is also invoked', async () => {
      const receiver = await ERC677ReceiverTest.new();
      expect(await receiver.from()).to.be.equal(ZERO_ADDRESS)
      expect(await receiver.value()).to.be.bignumber.equal(ZERO)
      expect(await receiver.data()).to.be.equal(null)
      expect(await receiver.someVar()).to.be.bignumber.equal(ZERO)

      await token.mint(user, 1, {from: owner }).should.be.fulfilled;
      await token.addBridgeContract(receiver.address).should.be.fulfilled;
      const {logs} = await token.transfer(receiver.address, 1, {from: user}).should.be.fulfilled;

      expect(await token.balanceOf(receiver.address)).to.be.bignumber.equal('1')
      expect(await token.balanceOf(user)).to.be.bignumber.equal(ZERO)
      expect(await receiver.from()).to.be.equal(user)
      expect(await receiver.value()).to.be.bignumber.equal('1')
      expect(await receiver.data()).to.be.equal(null)
      expect(logs[0].event).to.be.equal('Transfer')
    })
    it('if transfer called on contract, still works even if onTokenTransfer doesnot exist', async () => {
      const someContract = await POA20.new("Some", "Token", 18);
      await token.mint(user, 2, {from: owner }).should.be.fulfilled;
      const tokenTransfer = await token.transfer(someContract.address, 1, {from: user}).should.be.fulfilled;
      const tokenTransfer2 = await token.transfer(accounts[0], 1, {from: user}).should.be.fulfilled;
      expect(await token.balanceOf(someContract.address)).to.be.bignumber.equal('1')
      expect(await token.balanceOf(user)).to.be.bignumber.equal(ZERO)
      tokenTransfer.logs[0].event.should.be.equal("Transfer")
      tokenTransfer2.logs[0].event.should.be.equal("Transfer")

    })
  })
})

