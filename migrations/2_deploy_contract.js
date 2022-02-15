const { web3 } = require("@openzeppelin/test-helpers/src/setup");

const Wallet = artifacts.require("Wallet");

module.exports = async function (deployer, _network, accounts) {
  await deployer.deploy(Wallet, [accounts[0], accounts[1], accounts[2]], 2);
  const wallet = await Wallet.deployed();
  wallet.sendTransaction({from: accounts[1], value: web3.utils.toWei("1", 'ether')});
  
};
