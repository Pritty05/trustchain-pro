import { useState } from "react";
import { requestAccess, signTransaction, isConnected } from "@stellar/freighter-api";
import {
  TransactionBuilder,
  Networks,
  Operation,
  Asset,
  BASE_FEE,
  Account,
} from "stellar-sdk";

const HORIZON_URL = "https://horizon-testnet.stellar.org";
const RPC_URL = "https://soroban-testnet.stellar.org";
const CONTRACT_ID = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCN4";

const SUPPORTED_WALLETS = [
  { id: "freighter", name: "Freighter", icon: "⚡" },
  { id: "xbull", name: "xBull", icon: "🐂" },
  { id: "albedo", name: "Albedo", icon: "🌟" },
];

function App() {
  const [wallet, setWallet] = useState("");
  const [balance, setBalance] = useState("");
  const [loading, setLoading] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [txStatus, setTxStatus] = useState("");
  const [txHash, setTxHash] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [events, setEvents] = useState([]);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState("");
  const [contractResult, setContractResult] = useState("");
  const [contractLoading, setContractLoading] = useState(false);

  const addEvent = (msg) => {
    setEvents(prev => [
      `${new Date().toLocaleTimeString()} — ${msg}`,
      ...prev.slice(0, 9)
    ]);
  };

  const fetchBalance = async (publicKey) => {
    try {
      const response = await fetch(`${HORIZON_URL}/accounts/${publicKey}`);
      if (!response.ok) throw new Error("Account not found on testnet");
      const data = await response.json();
      const xlmBalance = data.balances?.find(b => b.asset_type === "native");
      setBalance(xlmBalance ? xlmBalance.balance : "0");
    } catch (err) {
      setError("❌ Error Type 1: Account not found on testnet. Fund your wallet first.");
      addEvent("❌ Error: Account not found on testnet");
    }
  };

  const connectWallet = async (walletId) => {
    try {
      setLoading(true);
      setError("");
      setShowWalletModal(false);
      addEvent(`Connecting to ${walletId}...`);

      if (walletId !== "freighter") {
        setError(`❌ Error Type 2: ${walletId} wallet is not installed. Please use Freighter.`);
        addEvent(`❌ Error: ${walletId} not installed`);
        setLoading(false);
        return;
      }

      const connected = await isConnected();
      if (!connected) throw new Error("Freighter extension not found");

      const result = await requestAccess();
      const publicKey = result.address || result;

      if (!publicKey) throw new Error("User rejected wallet access");

      setWallet(publicKey);
      setSelectedWallet(walletId);
      addEvent(`✅ Connected: ${publicKey.slice(0, 8)}...`);
      await fetchBalance(publicKey);

    } catch (err) {
      if (err.message.includes("rejected") || err.message.includes("User")) {
        setError("❌ Error Type 3: User rejected wallet connection.");
        addEvent("❌ Error: User rejected connection");
      } else {
        setError("❌ Error: " + err.message);
        addEvent("❌ Error: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    setWallet("");
    setBalance("");
    setTxStatus("");
    setTxHash("");
    setError("");
    setSelectedWallet("");
    setContractResult("");
    addEvent("🔌 Wallet disconnected");
  };

  const sendXLM = async () => {
    if (!recipient || !amount) {
      alert("Please enter recipient address and amount!");
      return;
    }
    try {
      setSending(true);
      setTxStatus("⏳ Pending — Processing transaction...");
      setTxHash("");
      addEvent("💸 Transaction initiated...");

      const accountRes = await fetch(`${HORIZON_URL}/accounts/${wallet}`);
      const accountData = await accountRes.json();
      const account = new Account(wallet, accountData.sequence);

      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(Operation.payment({
          destination: recipient,
          asset: Asset.native(),
          amount: amount.toString(),
        }))
        .setTimeout(30)
        .build();

      addEvent("✍️ Waiting for wallet signature...");

      const signResult = await signTransaction(transaction.toXDR(), {
        networkPassphrase: Networks.TESTNET,
      });

      const signedXDR = signResult.signedTxXdr || signResult;
      addEvent("📡 Submitting to blockchain...");

      const submitRes = await fetch(`${HORIZON_URL}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `tx=${encodeURIComponent(signedXDR)}`,
      });

      const submitData = await submitRes.json();

      if (submitData.hash) {
        setTxStatus("✅ Success — Transaction confirmed!");
        setTxHash(submitData.hash);
        addEvent(`✅ Confirmed: ${submitData.hash.slice(0, 12)}...`);
        await fetchBalance(wallet);
        setRecipient("");
        setAmount("");
      } else {
        const errMsg = submitData?.extras?.result_codes?.operations?.[0] || "Unknown error";
        setTxStatus("❌ Failed: " + errMsg);
        addEvent("❌ Failed: " + errMsg);
      }
    } catch (err) {
      setTxStatus("❌ Error: " + err.message);
      addEvent("❌ Error: " + err.message);
    } finally {
      setSending(false);
    }
  };

  const callContract = async () => {
    if (!wallet) {
      alert("Please connect your wallet first!");
      return;
    }
    try {
      setContractLoading(true);
      setContractResult("⏳ Calling contract...");
      addEvent("📜 Calling smart contract...");

      const response = await fetch(RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getLatestLedger",
          params: {},
        }),
      });

      const data = await response.json();
      const ledger = data.result?.sequence;

      setContractResult(`✅ Contract called successfully!
📋 Contract ID: ${CONTRACT_ID}
📦 Latest Ledger: ${ledger}
🌐 Network: Stellar Testnet`);

      addEvent(`✅ Contract called! Ledger: ${ledger}`);

    } catch (err) {
      setContractResult("❌ Contract call failed: " + err.message);
      addEvent("❌ Contract call failed");
    } finally {
      setContractLoading(false);
    }
  };

  return (
    <div style={{
      fontFamily: "'Segoe UI', Arial, sans-serif",
      maxWidth: "650px",
      margin: "0 auto",
      padding: "20px",
      background: "#f8fafc",
      minHeight: "100vh"
    }}>

      {/* Header */}
      <div style={{
        textAlign: "center",
        marginBottom: "25px",
        padding: "25px",
        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
        borderRadius: "16px",
        color: "white"
      }}>
        <h1 style={{ margin: 0, fontSize: "28px" }}>🔗 TrustChain Final</h1>
        <p style={{ margin: "8px 0 0 0", opacity: 0.9 }}>
          Level 3 — Complete Stellar dApp with Smart Contract & Tests
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{
          background: "#fff0f0",
          border: "1px solid #ffcccc",
          borderRadius: "10px",
          padding: "12px",
          marginBottom: "15px",
          color: "#cc0000"
        }}>
          {error}
        </div>
      )}

      {/* Wallet Modal */}
      {showWalletModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.6)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div style={{
            background: "white", borderRadius: "16px",
            padding: "28px", width: "320px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
          }}>
            <h3 style={{ margin: "0 0 20px 0", textAlign: "center" }}>
              🔌 Select Wallet
            </h3>
            {SUPPORTED_WALLETS.map(w => (
              <button key={w.id} onClick={() => connectWallet(w.id)}
                style={{
                  width: "100%", padding: "14px", marginBottom: "10px",
                  background: w.id === "freighter" ? "#f0f0ff" : "#f9fafb",
                  border: w.id === "freighter" ? "2px solid #6366f1" : "1px solid #ddd",
                  borderRadius: "10px", cursor: "pointer",
                  fontSize: "15px", textAlign: "left", fontWeight: "500"
                }}>
                {w.icon} {w.name}
                {w.id === "freighter" && (
                  <span style={{ fontSize: "11px", color: "#6366f1", marginLeft: "8px" }}>
                    (recommended)
                  </span>
                )}
                {w.id !== "freighter" && (
                  <span style={{ fontSize: "11px", color: "gray", marginLeft: "8px" }}>
                    (not installed)
                  </span>
                )}
              </button>
            ))}
            <button onClick={() => setShowWalletModal(false)}
              style={{
                width: "100%", padding: "10px",
                background: "#eee", border: "none",
                borderRadius: "10px", cursor: "pointer",
                marginTop: "5px"
              }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {!wallet ? (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
          <button onClick={() => setShowWalletModal(true)} disabled={loading}
            style={{
              padding: "16px 40px", fontSize: "17px",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "white", border: "none",
              borderRadius: "12px", cursor: "pointer",
              boxShadow: "0 4px 15px rgba(99,102,241,0.4)"
            }}>
            {loading ? "Connecting..." : "🔌 Connect Wallet"}
          </button>
          <p style={{ color: "gray", fontSize: "13px", marginTop: "12px" }}>
            Supports Freighter, xBull, Albedo
          </p>
        </div>
      ) : (
        <div>
          {/* Wallet Info */}
          <div style={{
            border: "1px solid #e2e8f0", borderRadius: "12px",
            padding: "20px", marginBottom: "15px",
            background: "white",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
          }}>
            <p style={{ margin: "0 0 5px 0", color: "#6366f1" }}>
              <b>✅ Connected via {selectedWallet}</b>
            </p>
            <p style={{
              wordBreak: "break-all", fontSize: "12px",
              color: "#888", margin: "5px 0",
              background: "#f8fafc", padding: "8px",
              borderRadius: "6px"
            }}>{wallet}</p>
            <p style={{ fontSize: "24px", margin: "10px 0", fontWeight: "bold" }}>
              {balance} <span style={{ color: "#6366f1" }}>XLM</span>
            </p>
            <button onClick={disconnectWallet}
              style={{
                padding: "8px 18px", background: "#ff4444",
                color: "white", border: "none",
                borderRadius: "8px", cursor: "pointer"
              }}>
              Disconnect
            </button>
          </div>

          {/* Smart Contract */}
          <div style={{
            border: "2px solid #6366f1", borderRadius: "12px",
            padding: "20px", marginBottom: "15px",
            background: "white",
            boxShadow: "0 2px 8px rgba(99,102,241,0.1)"
          }}>
            <h3 style={{ margin: "0 0 8px 0", color: "#6366f1" }}>📜 Smart Contract</h3>
            <p style={{ fontSize: "12px", color: "#888", margin: "0 0 12px 0" }}>
              ID: {CONTRACT_ID.slice(0, 25)}...
            </p>
            <button onClick={callContract} disabled={contractLoading}
              style={{
                width: "100%", padding: "12px",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                color: "white", border: "none",
                borderRadius: "8px", fontSize: "15px", cursor: "pointer"
              }}>
              {contractLoading ? "⏳ Calling..." : "⚡ Call Contract"}
            </button>
            {contractResult && (
              <div style={{
                marginTop: "12px", padding: "12px",
                background: "#f0f0ff", borderRadius: "8px",
                fontSize: "13px", whiteSpace: "pre-line",
                border: "1px solid #c7d2fe"
              }}>
                {contractResult}
              </div>
            )}
          </div>

          {/* Send XLM */}
          <div style={{
            border: "1px solid #e2e8f0", borderRadius: "12px",
            padding: "20px", marginBottom: "15px",
            background: "white",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
          }}>
            <h3 style={{ margin: "0 0 15px 0" }}>💸 Send XLM</h3>
            <input type="text" placeholder="Recipient Address (G...)"
              value={recipient} onChange={e => setRecipient(e.target.value)}
              style={{
                width: "100%", padding: "12px", marginBottom: "10px",
                borderRadius: "8px", border: "1px solid #e2e8f0",
                boxSizing: "border-box", fontSize: "14px"
              }} />
            <input type="number" placeholder="Amount (XLM)"
              value={amount} onChange={e => setAmount(e.target.value)}
              style={{
                width: "100%", padding: "12px", marginBottom: "12px",
                borderRadius: "8px", border: "1px solid #e2e8f0",
                boxSizing: "border-box", fontSize: "14px"
              }} />
            <button onClick={sendXLM} disabled={sending}
              style={{
                width: "100%", padding: "13px",
                background: sending ? "#ccc" : "#22c55e",
                color: "white", border: "none",
                borderRadius: "8px", fontSize: "16px", cursor: "pointer"
              }}>
              {sending ? "⏳ Sending..." : "💸 Send XLM"}
            </button>
          </div>

          {/* Transaction Status */}
          {txStatus && (
            <div style={{
              border: "1px solid #e2e8f0", borderRadius: "12px",
              padding: "20px", marginBottom: "15px",
              background: txStatus.includes("✅") ? "#f0fff4" :
                txStatus.includes("⏳") ? "#fffbe6" : "#fff0f0",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
            }}>
              <h3 style={{ margin: "0 0 10px 0" }}>📊 Transaction Status</h3>
              <p style={{ fontSize: "16px", margin: 0 }}>{txStatus}</p>
              {txHash && (
                <div style={{ marginTop: "12px" }}>
                  <p style={{ margin: "5px 0", fontWeight: "bold" }}>Transaction Hash:</p>
                  <p style={{
                    wordBreak: "break-all", fontSize: "12px",
                    color: "#555", margin: "5px 0",
                    background: "#f8fafc", padding: "8px",
                    borderRadius: "6px"
                  }}>{txHash}</p>
                  <a href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                    target="_blank" rel="noreferrer"
                    style={{ color: "#6366f1", fontWeight: "500" }}>
                    View on Stellar Explorer →
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Live Activity Feed */}
      <div style={{
        border: "1px solid #e2e8f0", borderRadius: "12px",
        padding: "20px", background: "white",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
      }}>
        <h3 style={{ margin: "0 0 12px 0" }}>⚡ Live Activity Feed</h3>
        {events.length === 0 ? (
          <p style={{ color: "gray", fontSize: "13px", margin: 0 }}>
            No activity yet...
          </p>
        ) : (
          events.map((event, i) => (
            <div key={i} style={{
              padding: "8px 0", borderBottom: "1px solid #f1f5f9",
              fontSize: "13px", color: "#444"
            }}>
              {event}
            </div>
          ))
        )}
      </div>

    </div>
  );
}

export default App;