import './style.css';
import { BrowserProvider } from 'ethers';

// Store connected wallets
const connectedWallets = {};

// Function to shorten wallet addresses for display
function shortenAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Function to update the UI with connected wallets
function updateWalletList() {
  const walletList = document.getElementById('wallet-list');
  walletList.innerHTML = '';

  if (Object.keys(connectedWallets).length === 0) {
    walletList.innerHTML = '<div class="no-wallets">No wallets connected</div>';
    return;
  }

  Object.entries(connectedWallets).forEach(([walletType, walletData]) => {
    if (walletData) {
      const walletItem = document.createElement('div');
      walletItem.className = 'wallet-item';

      const displayName = walletType.charAt(0).toUpperCase() + walletType.slice(1);

      walletItem.innerHTML = `
        <div class="wallet-details">
          <div class="wallet-type">${displayName}</div>
          <div class="wallet-address">${shortenAddress(walletData.address)}</div>
        </div>
        <button class="disconnect-btn" data-wallet="${walletType}">Disconnect</button>
      `;
      walletList.appendChild(walletItem);
    }
  });

  document.querySelectorAll('.disconnect-btn').forEach(button => {
    button.addEventListener('click', () => {
      const walletType = button.getAttribute('data-wallet');
      disconnectWallet(walletType);
    });
  });
}

// Function to connect to an Ethereum wallet
async function connectEthereumWallet(walletType, provider) {
  try {
    const accounts = await provider.request({ method: 'eth_requestAccounts' });
    const ethersProvider = new BrowserProvider(provider);

    connectedWallets[walletType] = {
      address: accounts[0],
      provider: ethersProvider
    };

    localStorage.setItem(`${walletType}_connected`, accounts[0]);

    const connectButton = document.getElementById(`connect-${walletType}`);
    connectButton.classList.add('connected');
    connectButton.textContent = `${walletType.charAt(0).toUpperCase() + walletType.slice(1)} Connected`;

    updateWalletList();
  } catch (error) {
    console.error(`Failed to connect to ${walletType}:`, error);
    alert(`Failed to connect to ${walletType}. ${error.message}`);
  }
}

// Function to connect MetaMask
async function connectMetaMask() {
  if (window.ethereum?.isMetaMask) {
    await connectEthereumWallet('metamask', window.ethereum);
  } else {
    alert('MetaMask is not installed.');
  }
}

// Function to connect Coinbase Wallet
async function connectCoinbase() {
  const provider = window.coinbaseWalletExtension || (window.ethereum?.isCoinbaseWallet ? window.ethereum : null);
  if (provider) {
    await connectEthereumWallet('coinbase', provider);
  } else {
    alert('Coinbase Wallet is not installed.');
  }
}

// Function to connect Trust Wallet
function getTrustWalletProvider() {
  if (window.trustwallet) {
    return window.trustwallet;
  }
  if (window.ethereum?.isTrust) {
    return window.ethereum;
  }
  if (window.ethereum?.providers) {
    return window.ethereum.providers.find(p => p.isTrust) || null;
  }
  return null;
}

async function connectTrustWallet() {
  const provider = getTrustWalletProvider();
  if (provider) {
    await connectEthereumWallet('trustwallet', provider);
  } else {
    alert('Trust Wallet is not installed.');
  }
}

// Function to connect BitGet Wallet
async function connectBitGet() {
  const provider = window.bitkeep?.ethereum || window.bitget?.ethereum;
  if (provider) {
    await connectEthereumWallet('bitget', provider);
  } else {
    alert('BitGet Wallet is not installed.');
  }
}

// Function to connect Phantom Wallet (Solana)
async function connectPhantom() {
  if (window.solana && window.solana.isPhantom) {
    try {
      const response = await window.solana.connect();
      connectedWallets['phantom'] = {
        address: response.publicKey.toString(),
        provider: window.solana
      };

      localStorage.setItem('phantom_connected', response.publicKey.toString());

      const connectButton = document.getElementById('connect-phantom');
      connectButton.classList.add('connected');
      connectButton.textContent = 'Phantom Connected';

      updateWalletList();
    } catch (error) {
      console.error('Failed to connect to Phantom:', error);
      alert(`Failed to connect to Phantom. ${error.message}`);
    }
  } else {
    alert('Phantom Wallet is not installed.');
  }
}

// Function to disconnect a wallet
function disconnectWallet(walletType) {
  delete connectedWallets[walletType];
  localStorage.removeItem(`${walletType}_connected`);

  const button = document.getElementById(`connect-${walletType}`);
  if (button) {
    button.classList.remove('connected');
    button.textContent = `Connect ${walletType.charAt(0).toUpperCase() + walletType.slice(1)}`;
  }

  updateWalletList();
}

// Restore connections from localStorage
async function restoreConnections() {
  const walletTypes = [
    { type: 'metamask', provider: window.ethereum?.isMetaMask ? window.ethereum : null },
    { type: 'coinbase', provider: window.coinbaseWalletExtension || (window.ethereum?.isCoinbaseWallet ? window.ethereum : null) },
    { type: 'trustwallet', provider: window.ethereum?.isTrust ? window.ethereum : null },
    { type: 'bitget', provider: window.bitkeep?.ethereum || window.bitget?.ethereum },
    { type: 'phantom', provider: window.solana && window.solana.isPhantom ? window.solana : null }
  ];

  for (const { type, provider } of walletTypes) {
    if (localStorage.getItem(`${type}_connected`) && provider) {
      try {
        const accounts = await provider.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          connectedWallets[type] = {
            address: accounts[0],
            provider: new BrowserProvider(provider)
          };
          const connectButton = document.getElementById(`connect-${type}`);
          connectButton.classList.add('connected');
          connectButton.textContent = `${type.charAt(0).toUpperCase() + type.slice(1)} Connected`;
        }
      } catch (error) {
        console.error(`Failed to restore ${type} connection:`, error);
      }
    }
  }

  updateWalletList();
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('connect-metamask')?.addEventListener('click', connectMetaMask);
  document.getElementById('connect-coinbase')?.addEventListener('click', connectCoinbase);
  document.getElementById('connect-trustwallet')?.addEventListener('click', connectTrustWallet);
  document.getElementById('connect-bitget')?.addEventListener('click', connectBitGet);
  document.getElementById('connect-phantom')?.addEventListener('click', connectPhantom);

  restoreConnections();
});

// Handle account changes separately for each wallet
const providerEvents = {
  metamask: window.ethereum?.isMetaMask ? window.ethereum : null,
  coinbase: window.coinbaseWalletExtension || (window.ethereum?.isCoinbaseWallet ? window.ethereum : null),
  trustwallet: window.ethereum?.isTrust ? window.ethereum : null,
  bitget: window.bitkeep?.ethereum || window.bitget?.ethereum,
  phantom: window.solana && window.solana.isPhantom ? window.solana : null
};

Object.entries(providerEvents).forEach(([walletType, provider]) => {
  if (provider) {
    provider.on('accountsChanged', (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet(walletType);
      } else if (connectedWallets[walletType]) {
        connectedWallets[walletType].address = accounts[0];
        updateWalletList();
      }
    });
  }
});
