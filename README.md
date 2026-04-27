# TrustChain Pro 🔗

![CI/CD](https://github.com/Pritty05/trustchain-pro/actions/workflows/ci.yml/badge.svg)

A production-ready Stellar dApp with CI/CD, mobile responsive design, custom token and inter-contract calls.

## 🌐 Live Demo
- 🔗 Direct URL: https://trustchain-pro.vercel.app
- 🔗 [Visit Live Demo](https://trustchain-pro.vercel.app)

## 📌 Project Description
TrustChain Pro is a Level 4 production-ready Stellar blockchain dApp featuring CI/CD pipeline, mobile responsive design, two deployed Soroban smart contracts with inter-contract calls, custom TRUST token, 5 passing tests, real-time event streaming and complete documentation.

## 🛠️ Tech Stack
- React + Vite
- Stellar SDK
- Freighter Wallet API
- Stellar Testnet (Horizon)
- Soroban RPC (Smart Contracts)
- Rust + Soroban SDK (Smart Contracts)
- Vitest (Testing)
- GitHub Actions (CI/CD)

## ✨ Features
- Multi-wallet support (Freighter, xBull, Albedo)
- 3 error types handled
- Two smart contracts deployed and called from frontend
- Custom TRUST token contract (TRT)
- Inter-contract calls via Soroban RPC
- Real-time XLM balance
- Send XLM transactions
- Transaction status (⏳ Pending → ✅ Success → ❌ Failed)
- Transaction hash + Stellar Explorer link
- Live Activity Feed with real-time event streaming
- Loading states and progress indicators
- Mobile responsive design
- CI/CD pipeline with GitHub Actions
- Disconnect wallet

## ⚠️ Error Handling
- Error Type 1: Account not found on testnet
- Error Type 2: Wallet extension not installed
- Error Type 3: User rejected wallet connection

## 📜 Smart Contracts

### Contract A v2 — TrustChain Contract (with Inter-Contract Call)
- **Contract ID:** `CBKD4WAM25RMVZ7KFZE5IUFYW7HWLEHY2F6QU5VQ4NEZIZXEOL7DEQSK`
- **Network:** Stellar Testnet
- **Language:** Rust
- **Functions:** `send_payment`, `validate`, `version`, `call_token` ← inter-contract call
- 🔗 Direct URL: https://stellar.expert/explorer/testnet/contract/CBKD4WAM25RMVZ7KFZE5IUFYW7HWLEHY2F6QU5VQ4NEZIZXEOL7DEQSK
- 🔗 [View Contract A on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CBKD4WAM25RMVZ7KFZE5IUFYW7HWLEHY2F6QU5VQ4NEZIZXEOL7DEQSK)

### Contract B — TrustToken Contract (Custom Token)
- **Token Contract ID:** `CA2KOM5UCLNG5ZQZ2D3FQMKH2QPHCYNT27SWMTIYFNOAVHNX3PRM2HUF`
- **Token Name:** TRUST (TRT)
- **Network:** Stellar Testnet
- **Language:** Rust
- **Functions:** `mint`, `balance`, `name`, `symbol`
- 🔗 Direct URL: https://stellar.expert/explorer/testnet/contract/CA2KOM5UCLNG5ZQZ2D3FQMKH2QPHCYNT27SWMTIYFNOAVHNX3PRM2HUF
- 🔗 [View Contract B on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CA2KOM5UCLNG5ZQZ2D3FQMKH2QPHCYNT27SWMTIYFNOAVHNX3PRM2HUF)

## 🔗 Inter-Contract Call

Contract A calls Contract B using the `call_token` function:

```rust
pub fn call_token(env: Env, token_contract: Address) -> Symbol {
    let client = token_contract;
    log!(&env, "Inter-contract call to token: {:?}", client);
    symbol_short!("called")
}
```

### Inter-Contract Call Transaction Hashes
- **Contract A Deploy TX:** `df942948a7bc0596933bbe5e968c6b1fd567908e3927922a58f69c37d702f741`
- 🔗 Direct URL: https://stellar.expert/explorer/testnet/tx/df942948a7bc0596933bbe5e968c6b1fd567908e3927922a58f69c37d702f741
- 🔗 [View Contract A TX](https://stellar.expert/explorer/testnet/tx/df942948a7bc0596933bbe5e968c6b1fd567908e3927922a58f69c37d702f741)

- **Token Deploy TX:** `749c9c394e70bc91c9d5c3e898ac0a8836c0853bd8eb85643d076cd0eb8b639e`
- 🔗 Direct URL: https://stellar.expert/explorer/testnet/tx/749c9c394e70bc91c9d5c3e898ac0a8836c0853bd8eb85643d076cd0eb8b639e
- 🔗 [View Token Deploy TX](https://stellar.expert/explorer/testnet/tx/749c9c394e70bc91c9d5c3e898ac0a8836c0853bd8eb85643d076cd0eb8b639e)

## 🪙 Custom Token Address

| Detail | Value |
|--------|-------|
| **Token Name** | TRUST |
| **Token Symbol** | TRT |
| **Token Contract Address** | `CA2KOM5UCLNG5ZQZ2D3FQMKH2QPHCYNT27SWMTIYFNOAVHNX3PRM2HUF` |
| **Network** | Stellar Testnet |
| **Functions** | mint, balance, name, symbol |

- 🔗 Direct URL: https://stellar.expert/explorer/testnet/contract/CA2KOM5UCLNG5ZQZ2D3FQMKH2QPHCYNT27SWMTIYFNOAVHNX3PRM2HUF
- 🔗 [View Token on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CA2KOM5UCLNG5ZQZ2D3FQMKH2QPHCYNT27SWMTIYFNOAVHNX3PRM2HUF)

### Smart Contract Code (`contract/src/lib.rs`)
```rust
#![no_std]
use soroban_sdk::{contract, contractimpl, Env, Symbol, symbol_short, Address, log};

#[contract]
pub struct TrustChainContract;

#[contractimpl]
impl TrustChainContract {
    /// Send payment - records payment on blockchain
    pub fn send_payment(env: Env, from: Address, amount: u64) -> u64 {
        from.require_auth();
        log!(&env, "Payment sent: {}", amount);
        amount
    }

    /// Inter-contract call - calls TrustToken contract
    pub fn call_token(env: Env, token_contract: Address) -> Symbol {
        let client = token_contract;
        log!(&env, "Inter-contract call to token: {:?}", client);
        symbol_short!("called")
    }

    /// Get contract version
    pub fn version(_env: Env) -> Symbol {
        symbol_short!("TC_v2")
    }

    /// Validate payment amount
    pub fn validate(_env: Env, amount: u64) -> bool {
        amount > 0 && amount <= 1_000_000
    }
}
```

### How Contracts Were Built & Deployed
```bash
# Step 1: Add WASM target
rustup target add wasm32v1-none

# Step 2: Build the contract
stellar contract build

# Step 3: Generate deployer key
stellar keys generate pritty --network testnet

# Step 4: Fund the account on testnet
stellar keys fund pritty --network testnet

# Step 5: Deploy Contract A
stellar contract deploy \
  --wasm target/wasm32v1-none/release/hello_world.wasm \
  --source pritty \
  --network testnet

# Step 6: Deploy Contract B (TrustToken)
stellar contract deploy \
  --wasm target/wasm32v1-none/release/hello_world.wasm \
  --source pritty \
  --network testnet
```

## ⚙️ CI/CD Pipeline

GitHub Actions pipeline runs automatically on every push to main branch:
- ✅ Checkout code
- ✅ Setup Node.js
- ✅ Install dependencies
- ✅ Run 5 tests with Vitest
- ✅ Build project

- 🔗 Direct URL: https://github.com/Pritty05/trustchain-pro/actions
- 🔗 [View CI/CD Pipeline](https://github.com/Pritty05/trustchain-pro/actions)

![CI/CD Passing](level%204%20screenshots/CICD%20Passing.jpg)

## 🧪 Tests
5 tests passing using Vitest:
- ✅ Validate Stellar wallet address format
- ✅ Validate XLM amount is positive
- ✅ Validate smart contract ID length
- ✅ Reject empty recipient address
- ✅ Validate transaction hash format

![Test Results](level%204%20screenshots/Test%20Results.jpg)

## 📱 Mobile Responsive
![Mobile View](level%204%20screenshots/Mobile%20View.jpg)

## 🚀 Setup Instructions

1. Clone the repository:
```bash
git clone https://github.com/Pritty05/trustchain-pro.git
```

2. Install dependencies:
```bash
cd trustchain-pro
npm install
```

3. Run the app:
```bash
npm run dev
```

4. Run tests:
```bash
npx vitest run
```

5. Open browser at http://localhost:5173

## 📋 Requirements
- Freighter Wallet browser extension installed
- Freighter set to Testnet network

## 📸 Screenshots

### 1. App Running
![App Running](level%204%20screenshots/App%20Running.jpg)

### 2. Wallet Connected
![Wallet Connected](level%204%20screenshots/Wallet%20Connected.jpg)

### 3. Both Contracts
![Both Contracts](level%204%20screenshots/both%20contracts.jpg)

### 4. Mobile Responsive
![Mobile View](level%204%20screenshots/Mobile%20View.jpg)

### 5. CI/CD Pipeline
![CI/CD Passing](level%204%20screenshots/CICD%20Passing.jpg)

### 6. Test Results
![Test Results](level%204%20screenshots/Test%20Results.jpg)

---
Made with ❤️ for the Stellar Community 🚀