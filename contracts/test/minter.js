const MinterProxy = artifacts.require("MinterProxy.sol");
const ERC677MultiBridgeToken = artifacts.require("ERC677MultiBridgeToken.sol");

const { ERROR_MSG } = require("./setup");

const { expect } = require("chai");
const Web3 = require("web3");

contract("MinterProxy", async accounts => {
  let token;
  let minter;
  beforeEach(async () => {
    token = await ERC677MultiBridgeToken.new("Token", "T1", 18);
    minter = await MinterProxy.new();

    await minter.initialize(token.address, accounts[0]);
    await token.transferOwnership(minter.address);
  });

  it("can mint from account_0", async () => {
    let account = web3.eth.accounts.create();
    await minter.mint(account.address, Web3.utils.toWei("10"), {
      from: accounts[0]
    });
    let balance = await token.balanceOf(account.address);

    expect(balance.toString()).to.be.equal(Web3.utils.toWei("10"));
  });

  it("can mint from operator", async () => {
    let operator = accounts[1];
    let account = web3.eth.accounts.create();

    await minter.addOperator(operator);
    await minter.mint(account.address, Web3.utils.toWei("10"), {
      from: operator
    });
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
    let ABI = [
      {
        constant: false,
        inputs: [
          {
            name: "newOwner",
            type: "address"
          }
        ],
        name: "transferOwnership",
        outputs: [],
        payable: false,
        stateMutability: "nonpayable",
        type: "function"
      }
    ];
    let owner = await token.owner();
    let account = web3.eth.accounts.create();

    const data = token.contract.methods
      .transferOwnership(account.address)
      .encodeABI();

    await minter.callToken(data);

    let newOwner = await token.owner();

    expect(owner).to.be.not.equal(newOwner);
  });
});
