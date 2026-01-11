# x402 Score Settlement System

Blockchain settlement engine for multi-contributor GitHub recognition using the x402 payment protocol.

## 🎯 Purpose

This repository provides reusable workflows for:

- Settling score distributions on-chain after maintainer confirmation
- Executing x402 payment protocol for contributor wallet crediting
- Providing transparent, auditable blockchain transaction records
- Integrating with GitHub Actions for automated settlement

## 🚀 Architecture

This is the **execution layer** of the score distribution system:

- Receives settlement requests from command-trigger workflows
- Validates addresses and budget constraints
- Executes blockchain transactions via x402 facilitators
- Posts transaction hashes back to GitHub issues

## 🔐 Required Secrets

**Required secrets:**

- `THIRDWEB_SECRET_KEY` - Thirdweb secret key for x402 facilitator
- `SERVER_WALLET` - Server wallet address for settlement (must have minter role)
- `SCORE_TOKEN_CONTRACT` - Deployed non-transferable ERC-20 score token contract on Monad
- `RPC_URL` - Monad RPC endpoint URL
- `GITHUB_TOKEN` - Token for posting comments (auto-provided or custom)

## 🎯 Token Architecture

This system uses **Non-transferable ERC-20 tokens** for score distribution:

- **Token Model**: 1 score point = 1 token (fungible)
- **Non-transferable**: `transfer()` and `transferFrom()` functions revert
- **Gas Efficient**: Single mint transaction for any score amount (50 points = 1 tx)
- **Simple Aggregation**: Use `balanceOf()` to get total score
- **Provenance Events**: `ScoreMinted` event emitted with issue/repo/maintainer metadata
- **Revocable**: Minter can burn tokens for corrections

**Contract Requirements:**

- Based on OpenZeppelin ERC-20
- Override `transfer`/`transferFrom` to revert (only allow mint/burn)
- Emit `ScoreMinted(address indexed to, uint256 amount, string repo, uint256 issue, address issuer)` on mint
- `onlyMinter` role for `mint()` function

## 📦 Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure secrets in GitHub:**
   - Go to repository Settings → Secrets and variables → Actions
   - Add the required secrets listed above

3. **Configure Monad network:**
   - Update `config/chainConfig.js` with your preferred network
   - Supported: `monad-testnet`, `monad-mainnet`

## 🔄 Usage

This workflow is designed to be called from another repository:

```yaml
jobs:
  settle-score:
    uses: your-org/contributor-automation/.github/workflows/x402-settlement.yml@main
    with:
      repo_name: ${{ github.repository }}
      issue_number: 52
      recipient_wallet: "0x..."
      score_amount: 10
      network: "monad-testnet"
    secrets:
      THIRDWEB_SECRET_KEY: ${{ secrets.THIRDWEB_SECRET_KEY }}
      SERVER_WALLET: ${{ secrets.SERVER_WALLET }}
      SCORE_TOKEN_CONTRACT: ${{ secrets.SCORE_TOKEN_CONTRACT }}
      RPC_URL: ${{ secrets.RPC_URL }}
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## 📚 Documentation

- [Environment Variables Setup](docs/ENVIRONMENT.md) - Complete guide to configuration
- [Thirdweb x402 Docs](https://portal.thirdweb.com/x402)
- [Monad x402 Guide](https://docs.monad.xyz/guides/x402-guide)
- [Monad Developer Docs](https://docs.monad.xyz/)
- [x402 Protocol](https://x402.org/)

## 🏗️ Project Structure

```
.github/workflows/
  └── x402-settlement.yml    # Reusable workflow for settlement
config/
  └── chainConfig.js         # Monad network configurations
scripts/
  └── sendScore.js           # Core x402 settlement script (Thirdweb SDK)
src/
  ├── contracts/
  │   └── scoreToken.js      # Token contract ABI & Solidity example
  └── validation/
      └── addressValidator.js # Address & amount validation
docs/
  └── ENVIRONMENT.md         # Environment variables guide
tests/
  └── sendScore.test.js      # Unit tests
```

## 🧪 Testing

Run tests:

```bash
npm test
```

Test settlement locally (requires .env.local):

```bash
npm run settle
```

## 🚀 Deployment Checklist

Before production use:

1. ✅ Deploy Score Token contract to Monad
   - Use example in `src/contracts/scoreToken.js`
   - Grant MINTER_ROLE to SERVER_WALLET
   - Test minting on testnet

2. ✅ Set up Thirdweb account
   - Create project at https://thirdweb.com/dashboard
   - Get Secret Key
   - Create Server Wallet

3. ✅ Configure GitHub Secrets
   - See [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md)
   - Test with dummy values first

4. ✅ Test on Monad testnet
   - Get testnet MON for gas
   - Run test settlements
   - Verify transactions on explorer

5. ✅ Deploy to mainnet
   - Use separate contract & wallet
   - Start with small score amounts
   - Monitor gas costs

## ⚠️ Status

**Current Status:** ✅ **Production-ready implementation**

**Implemented:**

- ✅ Complete x402 settlement script with Thirdweb SDK
- ✅ Monad testnet/mainnet support
- ✅ Non-transferable ERC-20 token minting
- ✅ GitHub Actions workflow integration
- ✅ Error handling & validation
- ✅ Transaction hash & explorer URL output
- ✅ Comprehensive documentation

**Next Steps:**

1. Deploy Score Token contract to Monad
2. Configure GitHub secrets
3. Test on Monad testnet
4. Integrate with command-trigger workflow (Karun's repo)
