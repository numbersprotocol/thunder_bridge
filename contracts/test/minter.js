const MinterBurnerProxy = artifacts.require("MinterBurnerProxy.sol");
const ERC677MultiBridgeToken = artifacts.require("ERC677MultiBridgeToken.sol");

const { ERROR_MSG } = require("./setup");

const { expect } = require("chai");
const Web3 = require("web3");

contract("MinterBurnerProxy", async accounts => {
  let token;
  let minter;
  beforeEach(async () => {
    token = await ERC677MultiBridgeToken.new("Token", "T1", 18);
    minter = await MinterBurnerProxy.new();

    await minter.initialize(token.address, accounts[0]);
    await token.transferOwnership(minter.address);
  });

  it("can mint from account_0", async () => {
    let account = web3.eth.accounts.create();
    await minter.mint(account.address, Web3.utils.toWei("10"), {
      from: accounts[0]
    }).should.be.fulfilled;
    let balance = await token.balanceOf(account.address);

    expect(balance.toString()).to.be.equal(Web3.utils.toWei("10"));
  });

  it("can mint from operator", async () => {
    let operator = accounts[1];
    let account = web3.eth.accounts.create();

    await minter.addOperator(operator);
    await minter.mint(account.address, Web3.utils.toWei("10"), {
      from: operator
    }).should.be.fulfilled;
    let balance = await token.balanceOf(account.address);
    expect(balance.toString()).to.be.equal(Web3.utils.toWei("10"));
  });

  it("cannot mint from removed operator", async () => {
    let operator = accounts[1];
    let account = web3.eth.accounts.create();

    await minter.addOperator(operator);
    await minter.removeOperator(operator);
    await minter
      .mint(account.address, Web3.utils.toWei("10"), {
        from: operator
      })
      .should.be.rejectedWith(ERROR_MSG);
  });

  it("can call token from owner", async () => {
    let owner = await token.owner();
    let account = web3.eth.accounts.create();

    const data = token.contract.methods
      .transferOwnership(account.address)
      .encodeABI();

    await minter.callToken(data).should.be.fulfilled;

    let newOwner = await token.owner();

    expect(owner).to.be.not.equal(newOwner);
  });

  it("can mint within per mint limit", async () => {
    await minter.setPerMintLimit(web3.utils.toWei("100"));
    let account = web3.eth.accounts.create();
    await minter.mint(account.address, Web3.utils.toWei("10"), {
      from: accounts[0]
    });
    let balance = await token.balanceOf(account.address);

    expect(balance.toString()).to.be.equal(Web3.utils.toWei("10"));
  });

  it("cannot mint beyond per mint limit", async () => {
    await minter.setPerMintLimit(web3.utils.toWei("100"));
    let account = web3.eth.accounts.create();
    await minter
      .mint(account.address, Web3.utils.toWei("101"), {
        from: accounts[0]
      })
      .should.be.rejectedWith(ERROR_MSG);
  });

  it("can mint within operator day limit", async () => {
    await minter.setOperatorDayLimit(web3.utils.toWei("100"), accounts[0]);
    let account = web3.eth.accounts.create();
    await minter.mint(account.address, Web3.utils.toWei("10"), {
      from: accounts[0]
    }).should.be.fulfilled;
    let balance = await token.balanceOf(account.address);

    expect(balance.toString()).to.be.equal(Web3.utils.toWei("10"));
  });

  it("cannot mint beyond operator day limit, but new day", async () => {
    await minter.setOperatorDayLimit(web3.utils.toWei("100"), accounts[0]);
    let account = web3.eth.accounts.create();
    await minter.mint(account.address, Web3.utils.toWei("100"), {
      from: accounts[0]
    }).should.be.fulfilled;
    await minter
      .mint(account.address, Web3.utils.toWei("1"), {
        from: accounts[0]
      })
      .should.be.rejectedWith("Exceed operator day limit");

    await web3.currentProvider.send(
      {
        jsonrpc: "2.0",
        method: "evm_increaseTime",
        params: [2 * 86400],
        id: 0
      },
      () => {}
    );
    await web3.currentProvider.send(
      {
        jsonrpc: "2.0",
        method: "evm_mine",
        params: [],
        id: 0
      },
      () => {}
    );

    await minter.mint(account.address, Web3.utils.toWei("1"), {
      from: accounts[0]
    }).should.be.fulfilled;
  });

  it("can mint within total day limit", async () => {
    await minter.setDayLimit(web3.utils.toWei("100"));
    let account = web3.eth.accounts.create();
    await minter.mint(account.address, Web3.utils.toWei("10"), {
      from: accounts[0]
    }).should.be.fulfilled;
    let balance = await token.balanceOf(account.address);

    expect(balance.toString()).to.be.equal(Web3.utils.toWei("10"));
  });

  it("cannot mint beyond total day limit, but new day", async () => {
    await minter.setDayLimit(web3.utils.toWei("100"));
    let account = web3.eth.accounts.create();
    await minter.addOperator(accounts[1]);
    await minter.mint(account.address, Web3.utils.toWei("50"), {
      from: accounts[0]
    }).should.be.fulfilled;
    await minter.mint(account.address, Web3.utils.toWei("50"), {
      from: accounts[1]
    }).should.be.fulfilled;

    await minter
      .mint(account.address, Web3.utils.toWei("1"), {
        from: accounts[1]
      })
      .should.be.rejectedWith("Exceed day limit");

    await web3.currentProvider.send(
      {
        jsonrpc: "2.0",
        method: "evm_increaseTime",
        params: [2 * 86400],
        id: 0
      },
      () => {}
    );
    await web3.currentProvider.send(
      {
        jsonrpc: "2.0",
        method: "evm_mine",
        params: [],
        id: 0
      },
      () => {}
    );

    await minter.mint(account.address, Web3.utils.toWei("1"), {
      from: accounts[1]
    }).should.be.fulfilled;
  });
});
