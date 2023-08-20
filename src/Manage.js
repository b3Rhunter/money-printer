import React, { useState } from 'react';
import { ethers } from 'ethers';
import MoneyABI from './Money.json';

function Manage({ userTokens, provider, truncateAndCopyAddress }) {

  const [amountToBurn, setAmountToBurn] = useState(0);

  const renounceOwnership = async (address) => {
    const signer = provider.getSigner();
    const moneyContract = new ethers.Contract(address, MoneyABI, signer);
    const tx = await moneyContract.renounceOwnership();
    await tx.wait()
  };

  const burnTokens = async (address, amount) => {
    const signer = provider.getSigner();
    const moneyContract = new ethers.Contract(address, MoneyABI, signer);
    const tx = await moneyContract.burn(ethers.utils.parseEther(amount.toString()));
    await tx.wait()
  };

  return (
    <div className='another-container'>
      {userTokens.map((token, index) => (
        <div className='token-container' key={index}>
        <div className='token-info'>
          <p>Token Address: <span className='address' onClick={() => truncateAndCopyAddress(token.address)} style={{ cursor: 'pointer' }}>{token.address.slice(0, 6) + "..."}</span></p>
          <p>Name: {token.name}</p>
          <p>Symbol: {token.symbol}</p>
          <p>Max Supply: {parseInt(ethers.utils.formatEther(token.maxSupply.toString())).toLocaleString()}</p>
          <p>Circulating Supply: {parseInt(ethers.utils.formatEther(token.circulatingSupply.toString())).toLocaleString()}</p>
          <p>Owner: <span className='address' onClick={() => truncateAndCopyAddress(token.owner)} style={{ cursor: 'pointer' }}>{token.owner}</span></p>
        </div>
       
          <div className='manage-btns'>
          <button className='manage-btns' onClick={() => renounceOwnership(token.address)}>Renounce Ownership</button>
          <input className='manage-btns' placeholder="Amount to Burn" onChange={e => setAmountToBurn(e.target.value)} />
          <button className='manage-btns' onClick={() => burnTokens(token.address, amountToBurn)}>Burn Tokens</button>
          </div>
        
    </div>
    ))}
</div>
);}

export default Manage;
