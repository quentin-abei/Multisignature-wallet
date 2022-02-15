const {expectRevert} = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const { assert } = require("console");
const Wallet = artifacts.require('Wallet');

contract('Wallet', (accounts) => {
  let wallet;
  beforeEach(async () => {
    wallet = await Wallet.new([accounts[0], accounts[1], accounts[2]], 2); 
    await web3.eth.sendTransaction({from: accounts[0], to: wallet.address, value: 1000}); 
  });

  it('should have correct approvers and quorum', async () => {
    const approvers = await wallet.getApprovers();
    const quorum = await wallet.quorum();
    /* we test the initial state of our contract &
    we should have 3 approvers and quorum of 2 approvers must be reached before
    creating any transfer
    */
    assert(approvers.length === 3);
    assert(approvers[0] === accounts[0]);
    assert(approvers[1] === accounts[1]);
    assert(approvers[2] === accounts[2]);
    assert(quorum.toNumber() === 2);
  });

  it('should create transfers', async () =>{
        /*Only approvers can create transfers after quorum have been reached
         function createTransfer
         */
        /*approver from account[0] create a transfer to account[5] with a value of 100
        then we get the transfers*/
        await wallet.createTransfer(100, accounts[5], {from: accounts[0]});
        const transfers = await wallet.getTransfers();

        assert(transfers.length === 1);
        assert(transfers[0].id === '0');
        assert(transfers[0].amount === '100');
        assert(transfers[0].to === accounts[5]);
        assert(transfers[0].approvals === '0');
        assert(transfers[0].sent === false);


  });

  /*but what if someone try to call the createTransfer 
  function if he is not an approver ?
  it will triger the modifier function and throw an error
  we test this by using openzeppelin test-helpers expectRevert function*/

  it('should NOT create transfers if sender is not approved', async() =>{
     await expectRevert(
            wallet.createTransfer(100, accounts[5], {from: accounts[4]}),
            /*accounts 4 is not in the list of approvers
            then we give the reason why it reverts*/
            'only approver allowed'
     );
  });

  /*approveTransfer function allows approvers to approve transfer that have been already
  created before and when we have a number of x >= to quorum then the transfer will be sent
  */

  it('should increment approvals', async() => {
      /*if we have not reached yet the quorum then 
      wait to increments number of approvals 
      untill we reach minimum number of approvals aka quorum*/
      await wallet.createTransfer(100, accounts[5], {from: accounts[0]});
      await wallet.approveTransfer(0, {from: accounts[0]});
      const transfers = await wallet.getTransfers();
      /*we use web3 to get balannce of the wallet
      */
     const balance = await web3.eth.getBalance(wallet.address);
      assert(transfers[0].approvals === '1');
      assert(transfers[0].sent === false);
      /*We originally sent 1000 wei to the smart contract in the beforeEach block
      */    
      assert(balance === 1000);

  });
   
  /*but if we do reach the quorum and smart contract receive enough approval
  then it will proceed the transfer */
  it('should send transfer if quorum reached', async() =>{
      /*get balance of receiver befpre transaction*/
     const  balanceBefore =  web3.utils.toBN(await web3.eth.getBalance(accounts[6]));
     await wallet.createTransfer(100, accounts[6], {from: accounts[0]});
     /*the two approvers / quorum reached */
     await wallet.approveTransfer(0, {from: accounts[0]});
     await wallet.approveTransfer(0, {from: accounts[1]});

     /*get balance after */
     const  balanceAfter =  web3.utils.toBN( await web3.eth.getBalance(accounts[6]));
     //now substract the 2 balances to get the amount transfered
     assert(balanceAfter.sub(balanceBefore).toNumber === 100);


  });

  it('should NOT approve transfer if sender is not approved', async () => {
    await wallet.createTransfer(100, accounts[5], {from: accounts[0]});
    await expectRevert(
      wallet.approveTransfer(0, {from: accounts[4]}),
      'only approver allowed'
    );
  });

  it('should NOT approve transfer is transfer is already sent', async () => {
    await wallet.createTransfer(100, accounts[6], {from: accounts[0]});
    await wallet.approveTransfer(0, {from: accounts[0]});
    await wallet.approveTransfer(0, {from: accounts[1]});
    await expectRevert(
      wallet.approveTransfer(0, {from: accounts[2]}),
      'transfer has already been sent'
    );
  });

  it('should NOT approve transfer twice', async () => {
    await wallet.createTransfer(100, accounts[6], {from: accounts[0]});
    await wallet.approveTransfer(0, {from: accounts[0]});
    await expectRevert(
      wallet.approveTransfer(0, {from: accounts[0]}),
      'cannot approve transfer twice'
    );
  });
})