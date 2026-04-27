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

    /// Get contract version
    pub fn version(_env: Env) -> Symbol {
        symbol_short!("TC_v1")
    }

    /// Validate payment amount
    pub fn validate(_env: Env, amount: u64) -> bool {
        amount > 0 && amount <= 1_000_000
    }
}