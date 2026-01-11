# GitHub Secrets Configuration

Set these secrets in your GitHub repository (Settings → Secrets and variables → Actions → New repository secret):

## Required Secrets

### 1. THIRDWEB_SECRET_KEY

**Value:** `RZFz4fDR-qb3VoioaTcNf94SOE1CY0cnmhjLfnx0EGFZRQgj-6H6m0H2yEtVgkhjDITIaRtIXFsB4b7Z108gAw`

- Get your actual key from: https://thirdweb.com/dashboard/settings/api-keys
- This is for testing; use a production key for mainnet

### 2. SERVER_WALLET

**Value:** `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

- Private key of the wallet that will execute mints
- Address: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- ⚠️ MUST have X402_EXECUTOR_ROLE on the ScoreToken contract
- ⚠️ MUST have MON tokens for gas fees

### 3. SCORE_TOKEN_CONTRACT

**Value:** `0xFea9868391EaB5204dcac3a4A416366B5F54B3C3`

- Your deployed ScoreToken contract address on Monad testnet
- Deployed at block: 5456239
- Transaction: 0x162d5f412452d739c0c7641f2f153fb8420a27b6c134471b5ff80b8d10d006a6

### 4. RPC_URL

**Value:** `https://testnet.monad.xyz`

- Monad testnet RPC endpoint
- For mainnet, use: `https://rpc.monad.xyz`

### 5. GITHUB_TOKEN

**Value:** Leave empty or set to `${{ secrets.GITHUB_TOKEN }}`

- Automatically provided by GitHub Actions
- No need to create manually

---

## Verification Checklist

Before running the workflow:

- [ ] All 5 secrets are set in GitHub repository settings
- [ ] SERVER_WALLET address has X402_EXECUTOR_ROLE on ScoreToken contract
- [ ] SERVER_WALLET has MON tokens for gas (get from faucet: https://faucet.monad.xyz)
- [ ] SCORE_TOKEN_CONTRACT is verified on Monad explorer (optional but recommended)

## Quick Commands

### Get server wallet address:

```bash
node scripts/getWalletAddress.js
```

### Grant X402_EXECUTOR_ROLE (run from Foundry project):

```bash
cast send 0xFea9868391EaB5204dcac3a4A416366B5F54B3C3 \
  "grantRole(bytes32,address)" \
  0x5e226c97e18028bb0c52d1f4c1dc778cbd0ac836f60373f99d9a413fb5b1a725 \
  0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 \
  --rpc-url https://testnet.monad.xyz \
  --private-key $PRIVATE_KEY
```

### Check if role is granted:

```bash
cast call 0xFea9868391EaB5204dcac3a4A416366B5F54B3C3 \
  "hasRole(bytes32,address)(bool)" \
  0x5e226c97e18028bb0c52d1f4c1dc778cbd0ac836f60373f99d9a413fb5b1a725 \
  0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 \
  --rpc-url https://testnet.monad.xyz
```

### Check server wallet balance:

```bash
cast balance 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --rpc-url https://testnet.monad.xyz
```

---

## Integration Complete! 🎉

Your x402 settlement system is now connected to your deployed ScoreToken contract on Monad testnet.
