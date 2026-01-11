# Environment Variables

## Required for x402 Settlement

### GitHub Secrets (set in repository settings)

```bash
# Thirdweb Configuration
THIRDWEB_SECRET_KEY=your_thirdweb_secret_key_here
# Get from: https://thirdweb.com/dashboard → Settings → API Keys

# Server Wallet (Minter)
SERVER_WALLET=0xYourServerWalletPrivateKeyHere
# This wallet must have MINTER_ROLE on the score token contract
# Get from: Thirdweb Dashboard → Wallets → Server Wallets

# Score Token Contract
SCORE_TOKEN_CONTRACT=0xYourDeployedTokenContractAddress
# Deploy the non-transferable ERC-20 contract to Monad first
# See: src/contracts/scoreToken.js for contract specification

# Monad RPC
RPC_URL=https://testnet.monad.xyz
# Testnet: https://testnet.monad.xyz
# Mainnet: https://rpc.monad.xyz

# GitHub Token (auto-provided in Actions)
GITHUB_TOKEN=${{ secrets.GITHUB_TOKEN }}
# This is automatically provided by GitHub Actions
```

## Workflow Inputs (provided by caller)

```yaml
# Repository information
repo_name: 'owner/repository'

# Issue/PR number
issue_number: 52

# Recipient wallet address (EIP-55 checksummed)
recipient_wallet: '0xRecipientAddressHere'

# Score amount to mint
score_amount: 10

# Network selection
network: 'monad-testnet'  
```

## How to Set Secrets in GitHub

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret from the list above

## How to Get Thirdweb Keys

1. Go to https://thirdweb.com/dashboard
2. Sign in with wallet or email
3. Create a new project (if you don't have one)
4. Go to **Settings** → **API Keys**
5. Copy:
   - **Client ID** (for frontend - not needed for this workflow)
   - **Secret Key** (for backend - use this as `THIRDWEB_SECRET_KEY`)

## How to Create a Server Wallet

1. In Thirdweb dashboard, expand **Wallets** in sidebar
2. Click **Server Wallets** → **Wallets** tab
3. Create a new wallet or use the default Project Wallet
4. Copy the wallet address
5. **Important**: Export the private key and set it as `SERVER_WALLET` secret
6. Fund this wallet with MON tokens on Monad for gas fees

## How to Deploy the Score Token Contract

See [src/contracts/scoreToken.js](../src/contracts/scoreToken.js) for:
- Contract ABI
- Example Solidity implementation
- Deployment checklist

### Quick Deployment Steps:

1. **Write the contract** (see example in scoreToken.js)
2. **Deploy to Monad** using Thirdweb, Hardhat, or Foundry
3. **Grant MINTER_ROLE** to your SERVER_WALLET address
4. **Set contract address** as `SCORE_TOKEN_CONTRACT` secret

## Testing Locally

Create a `.env.local` file (never commit this):

```bash
THIRDWEB_SECRET_KEY=your_secret_key
SERVER_WALLET=0xYourPrivateKey
SCORE_TOKEN_CONTRACT=0xDeployedContractAddress
RPC_URL=https://testnet.monad.xyz
RECIPIENT_WALLET=0xTestRecipient
SCORE_AMOUNT=10
NETWORK=monad-testnet
ISSUE_NUMBER=1
REPO_NAME=test/repo
```

Run locally:
```bash
npm run settle
```

## Network Information

### Monad Testnet
- **Chain ID**: 41454
- **RPC URL**: https://testnet.monad.xyz
- **Explorer**: https://explorer.testnet.monad.xyz
- **Faucet**: [Get testnet USDC](https://docs.monad.xyz/guides/x402-guide#how-to-get-usdc-tokens-on-monad-testnet)

### Monad Mainnet
- **Chain ID**: 41454
- **RPC URL**: https://rpc.monad.xyz
- **Explorer**: https://monadvision.com

## Security Best Practices

1. ✅ **Never commit private keys or secrets** to git
2. ✅ **Use GitHub Secrets** for all sensitive data
3. ✅ **Restrict SERVER_WALLET** to only have MINTER_ROLE (not admin)
4. ✅ **Test on testnet** before deploying to mainnet
5. ✅ **Monitor wallet balance** for gas fees
6. ✅ **Audit contract** before deploying to mainnet
7. ✅ **Use separate wallets** for testnet and mainnet

## Troubleshooting

### "Missing required environment variables"
- Check all secrets are set in GitHub repository settings
- Verify secret names match exactly (case-sensitive)

### "Invalid address format"
- Ensure addresses start with `0x` and are 42 characters long
- Verify EIP-55 checksum (use ethers.getAddress() to validate)

### "Transaction failed"
- Check SERVER_WALLET has enough MON for gas
- Verify SERVER_WALLET has MINTER_ROLE on contract
- Check recipient address is valid

### "Network error"
- Verify RPC_URL is correct for your network
- Check Monad network status
- Try alternative RPC endpoint if available
