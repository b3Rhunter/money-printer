import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import MoneyPrinterABI from './MoneyPrinter.json';
import MoneyABI from './Money.json';
import Manage from './Manage';
import Notification from './Notification';

const MoneyPrinterAddress = "0x4D19ACB400f52F11c727d5dA9614644a7Ca8dF0A";

function App() {

  const [connected, setConnected] = useState(false);
  const [provider, setProvider] = useState(null);
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [initialSupply, setInitialSupply] = useState(0);
  const [maxSupply, setMaxSupply] = useState(0);
  const [costPerToken, setCostPerToken] = useState(0);
  const [amountToMint, setAmountToMint] = useState(0);
  const [tokenAddress, setTokenAddress] = useState(null);
  const [userTokens, setUserTokens] = useState([]);
  const [allTokens, setAllTokens] = useState([]);
  const [ensName, setEnsName] = useState(null);

  const [createToken, setCreateToken] = useState(true);
  const [mintTokens, setMintTokens] = useState(false);
  const [manageTokens, setManage] = useState(false);
  const [notification, setNotification] = useState({ message: '', show: false });

  const connect = async () => {
    try {
      let _provider;

      _provider = new ethers.providers.Web3Provider(window.ethereum);
      await _provider.send("eth_requestAccounts", []);
      const network = await _provider.getNetwork();
      const desiredChainId = '0x2105';
      if (network.chainId !== parseInt(desiredChainId)) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: desiredChainId }],
          });
        } catch (switchError) {
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: desiredChainId,
                  chainName: 'Base Mainnet',
                  nativeCurrency: {
                    name: 'ETH',
                    symbol: 'ETH',
                    decimals: 18
                  },
                  rpcUrls: ['https://developer-access-mainnet.base.org'],
                  blockExplorerUrls: ['https://basescan.org'],
                }],
              });
            } catch (addError) {
              throw addError;
            }
          } else {
            throw switchError;
          }
        }
      }
      _provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = _provider.getSigner();
      await signer.signMessage("Welcome to MoneyPrinter.fun!");
      const { ethereum } = window;
      if(ethereum) {
        const ensProvider = new ethers.providers.InfuraProvider('mainnet');
        const address = await signer.getAddress();
        const displayAddress = address?.substr(0, 6) + "...";
        const ens = await ensProvider.lookupAddress(address);
        if (ens !== null) {
          setEnsName(ens)
          showNotification("Welcome " + ens);
        } else {
          setEnsName(displayAddress)
          showNotification("Welcome " + displayAddress);
        }
      }
      setProvider(_provider);
      setConnected(true);
    } catch (error) {
      console.log(error)
      showNotification("error...");
    }
  }

  const disconnect = () => {
    setConnected(false);
    showNotification("disconnected...");
  }

  const printToken = async () => {
    const signer = provider.getSigner();
    const moneyPrinterContract = new ethers.Contract(MoneyPrinterAddress, MoneyPrinterABI, signer);
    const costPerTokenInWei = ethers.utils.parseEther(costPerToken.toString());
    const result = await moneyPrinterContract.print(name, symbol, initialSupply, maxSupply, costPerTokenInWei, { value: ethers.utils.parseEther('0.003') });
    const receipt = await result.wait();

    const eventTopic = ethers.utils.id("ERC20Created(address,address)");
    const log = receipt.logs.find(log => log.topics[0] === eventTopic);

    if (log) {
      const event = moneyPrinterContract.interface.decodeEventLog("ERC20Created", log.data, log.topics);
      const tokenAddress = event.tokenAddress;
      setTokenAddress(tokenAddress);
    } else {
      console.error("ERC20Created event not found in transaction receipt");
    }
    showNotification("Token Created!");
  };

  const mintToken = async (amount, token) => {
    if (!token.address) {
      console.error("Token address is null");
      return;
    }
    const signer = provider.getSigner();
    const moneyContract = new ethers.Contract(token.address, MoneyABI, signer);
    const parseAmount = ethers.utils.parseEther(amount);
    const costPerTokenInWei = ethers.utils.parseEther(ethers.utils.formatEther(token.pricePerToken));
    const totalCost = ethers.BigNumber.from(costPerTokenInWei).mul(parseAmount);
    
    const tx = await moneyContract.mint(parseAmount, { value: totalCost });
    await tx.wait()
    showNotification("Tokens Minted!");
  };
  

  const getAllTokens = async () => {
    const signer = provider.getSigner();
    const moneyPrinterContract = new ethers.Contract(MoneyPrinterAddress, MoneyPrinterABI, signer);
    const addresses = await moneyPrinterContract.getAllTokens();
    const tokens = await Promise.all(addresses.map(async address => {
      const tokenContract = new ethers.Contract(address, MoneyABI, signer);
      const name = await tokenContract.name();
      const symbol = await tokenContract.symbol();
      const maxSupply = await tokenContract.maxSupply();
      const circulatingSupply = await tokenContract.totalSupply();
      const pricePerToken = await tokenContract.pricePerToken();
      const ensProvider = new ethers.providers.InfuraProvider('mainnet');
      const ownerAddress = await tokenContract.owner();
      const ownerEns = await ensProvider.lookupAddress(ownerAddress);
      const ownerDisplay = ownerEns !== null ? ownerEns : ownerAddress?.substr(0, 6) + "...";
      return { address, name, symbol, maxSupply, circulatingSupply, pricePerToken, owner: ownerDisplay };
          }));
    setAllTokens(tokens);
  };

  const getUserTokens = async () => {
    const signer = provider.getSigner();
    const moneyPrinterContract = new ethers.Contract(MoneyPrinterAddress, MoneyPrinterABI, signer);
    const addresses = await moneyPrinterContract.getTokensByUser(signer.getAddress());
    const tokens = await Promise.all(addresses.map(async address => {
      const tokenContract = new ethers.Contract(address, MoneyABI, signer);
      const name = await tokenContract.name();
      const symbol = await tokenContract.symbol();
      const maxSupply = await tokenContract.maxSupply();
      const circulatingSupply = await tokenContract.totalSupply();
      const pricePerToken = await tokenContract.pricePerToken();
      const ensProvider = new ethers.providers.InfuraProvider('mainnet');
      const ownerAddress = await tokenContract.owner();
      const ownerEns = await ensProvider.lookupAddress(ownerAddress);
      const ownerDisplay = ownerEns !== null ? ownerEns : ownerAddress?.substr(0, 6) + "...";
      return { address, name, symbol, maxSupply, circulatingSupply, pricePerToken, owner: ownerDisplay };
          }));
    setUserTokens(tokens);
  };

  const truncateAndCopyAddress = (address) => {
    const truncatedAddress = address.slice(0, 6) + "...";
    navigator.clipboard.writeText(address);
    showNotification("copied!");
    return truncatedAddress;
  };

  useEffect(() => {
    if (connected) {
      getUserTokens();
      getAllTokens();
    }
  }, [connected, tokenAddress]);

  function showCreate() {
    setCreateToken(true)
    setMintTokens(false)
    setManage(false)
  }

  function showMinting() {
    setCreateToken(false)
    setMintTokens(true)
    setManage(false)
  }

  function showManage() {
    setManage(true)
    setCreateToken(false)
    setMintTokens(false)
  }

  const addTokenToMetaMask = async (address, symbol, decimals, image) => {
    try {
      const wasAdded = await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address,
            symbol,
            decimals,
            image,
          },
        },
      });
  
      if (wasAdded) {
        console.log('Token was added!');
        showNotification("Token added!");
      } else {
        console.log('Token was not added');
        showNotification("error...");
      }
    } catch (error) {
      console.log('Error adding token to MetaMask:', error);
      showNotification("error...");
    }
  };
  
  const showNotification = (message) => {
    setNotification({ message, show: true });
  };

  return (
    <div className="App">
      <header>
        <h1 className='title'>MoneyPrinter.fun</h1>
      </header>
      <section>
        {!connected && (
          <div>
            <button className='disconnect-button' onClick={connect}>connect</button>
          </div>
        )}
        {connected && (
          <div>
            <button className='disconnect-button' onClick={disconnect}>{ensName}</button>
          </div>
        )}
      </section>

      <section className='creator-ui'>
        {!connected && (
          <div className='connect-container'>
          <p className='please-connect'>please connect wallet...</p>
          </div>
        )}
        {connected && (
          <div className='container-again'>

              <div className='nav'>
                <button onClick={showCreate}>Create Token</button>
                <button onClick={showMinting}>Mint Tokens</button>
                <button onClick={showManage}>Manage Tokens</button>
              </div>

            {createToken && (
            <div className='creator-ui-container'>
            <input type="text" placeholder="Token Name" onChange={e => setName(e.target.value)} />
            <input type="text" placeholder="Ticker Symbol" onChange={e => setSymbol(e.target.value)} />
            <input placeholder="Initial Supply" onChange={e => setInitialSupply(e.target.value)} />
            <input placeholder="Supply Cap" onChange={e => setMaxSupply(e.target.value)} />
            <input placeholder="Set Token Price" onChange={e => setCostPerToken(e.target.value)} />
            <button onClick={printToken}>Deploy</button>
            </div>
            )}
            {mintTokens && (
            <div className='another-container'>
            {allTokens.map((token, index) => (
              <div className='token-container' key={index}>
                <div className='token-info'>
                  <p>Contract Address: <span className='address' onClick={() => truncateAndCopyAddress(token.address)} style={{ cursor: 'pointer' }}>{token.address.slice(0, 6) + "..."}</span></p>
                  <p>Name: {token.name}</p>
                  <p>Ticker: {token.symbol}</p>
                  <p>Max Supply: {parseInt(ethers.utils.formatEther(token.maxSupply.toString())).toLocaleString()}</p>
                  <p>Circulating Supply: {parseInt(ethers.utils.formatEther(token.circulatingSupply.toString())).toLocaleString()}</p>
                  <p>Owner: <span className='address' onClick={() => truncateAndCopyAddress(token.owner)} style={{ cursor: 'pointer' }}>{token.owner}</span></p>
                </div>
                <div className='mint-container'>
                  <div className='fucking-container'>
                  <span>Price: {ethers.utils.formatEther(token.pricePerToken)} ETH</span>
                  <input className='mint-input' placeholder="enter amount..." onChange={e => setAmountToMint(e.target.value)} />
                  <button className='mint-btn' onClick={() => mintToken(amountToMint, token)}>MINT</button>
                  <button className='mint-btn'
                    onClick={() => addTokenToMetaMask(token.address, token.symbol, '18', 'https://github.com/b3Rhunter/fine-logo/raw/main/eth.png')}
                  >
                    Add to Wallet
                  </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
            )}
            {manageTokens && (
              <Manage showNotification={showNotification} userTokens={userTokens} provider={provider} truncateAndCopyAddress={truncateAndCopyAddress} addTokenToMetaMask={addTokenToMetaMask}/>
            )}
          </div>
        )}
      </section>
      <Notification
        message={notification.message}
        show={notification.show}
        setShow={(show) => setNotification({ ...notification, show })}
      />
    </div>
  );
}

export default App;
