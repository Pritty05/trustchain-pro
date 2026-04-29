import { useState } from "react";
import { requestAccess, signTransaction, isConnected } from "@stellar/freighter-api";
import {
  TransactionBuilder, Networks, Operation, Asset,
  BASE_FEE, Account, Memo,
} from "stellar-sdk";

const HORIZON_URL = "https://horizon-testnet.stellar.org";
const CONTRACT_ID = "CBKD4WAM25RMVZ7KFZE5IUFYW7HWLEHY2F6QU5VQ4NEZIZXEOL7DEQSK";
const TOKEN_CONTRACT_ID = "CA2KOM5UCLNG5ZQZ2D3FQMKH2QPHCYNT27SWMTIYFNOAVHNX3PRM2HUF";
const GOOGLE_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLScCgc-YNdstJDQCW2sVOVOh6xXkwvCVLBGP9bX-eZvxf30sRA/viewform";
const RPC_URL = "https://soroban-testnet.stellar.org";

const TABS = [
  { id: "escrow", label: "💼 Escrow", desc: "Freelancer Payments" },
  { id: "remittance", label: "💸 Remittance", desc: "Cross-border Transfers" },
  { id: "loyalty", label: "🎁 Loyalty", desc: "Earn TRUST Tokens" },
  { id: "certificate", label: "🎓 Certificate", desc: "On-chain Verification" },
  { id: "crowdfunding", label: "🌱 Crowdfunding", desc: "Fund Campaigns" },
];

const sendTx = async (wallet, ops, memo) => {
  const res = await fetch(`${HORIZON_URL}/accounts/${wallet}`);
  const data = await res.json();
  if (!data.sequence) throw new Error("Account not found. Fund your wallet first.");
  const account = new Account(wallet, data.sequence);
  let builder = new TransactionBuilder(account, {
    fee: BASE_FEE, networkPassphrase: Networks.TESTNET,
  });
  ops.forEach(op => builder.addOperation(op));
  if (memo) builder.addMemo(Memo.text(memo));
  const tx = builder.setTimeout(30).build();
  const signResult = await signTransaction(tx.toXDR(), { networkPassphrase: Networks.TESTNET });
  const signedXDR = typeof signResult === "string" ? signResult :
    signResult?.signedTxXdr || signResult?.result?.signedTxXdr || signResult?.xdr;
  if (!signedXDR) throw new Error("Could not get signed XDR from Freighter");
  const submitRes = await fetch(`${HORIZON_URL}/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `tx=${encodeURIComponent(signedXDR)}`,
  });
  const submitData = await submitRes.json();
  if (!submitData.hash) throw new Error("TX failed: " + JSON.stringify(submitData?.extras?.result_codes));
  return submitData.hash;
};

function App() {
  const [wallet, setWallet] = useState("");
  const [balance, setBalance] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("escrow");
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");

  const [escrowRecipient, setEscrowRecipient] = useState("");
  const [escrowAmount, setEscrowAmount] = useState("");
  const [escrowWork, setEscrowWork] = useState("");
  const [escrowHash, setEscrowHash] = useState("");
  const [escrowLoading, setEscrowLoading] = useState(false);

  const [remitRecipient, setRemitRecipient] = useState("");
  const [remitAmount, setRemitAmount] = useState("");
  const [remitCountry, setRemitCountry] = useState("");
  const [remitHash, setRemitHash] = useState("");
  const [remitLoading, setRemitLoading] = useState(false);

  const [loyaltyHash, setLoyaltyHash] = useState("");
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);

  const [certName, setCertName] = useState("");
  const [certCourse, setCertCourse] = useState("");
  const [certDate, setCertDate] = useState("");
  const [certHash, setCertHash] = useState("");
  const [certLoading, setCertLoading] = useState(false);
  const [verifyCert, setVerifyCert] = useState("");
  const [verifyResult, setVerifyResult] = useState("");

  const [campaignTitle, setCampaignTitle] = useState("");
  const [campaignGoal, setCampaignGoal] = useState("");
  const [campaignDonate, setCampaignDonate] = useState("");
  const [campaignCreator, setCampaignCreator] = useState("");
  const [campaignHash, setCampaignHash] = useState("");
  const [campaignLoading, setCampaignLoading] = useState(false);

  const addEvent = (msg) => setEvents(prev => [`${new Date().toLocaleTimeString()} — ${msg}`, ...prev.slice(0, 9)]);

  const fetchBalance = async (pk) => {
    const r = await fetch(`${HORIZON_URL}/accounts/${pk}`);
    if (!r.ok) throw new Error("Account not found");
    const d = await r.json();
    const b = d.balances?.find(b => b.asset_type === "native");
    setBalance(b ? parseFloat(b.balance).toFixed(2) : "0");
  };

  const connectWallet = async () => {
    try {
      setLoading(true); setError("");
      const connected = await isConnected();
      if (!connected) throw new Error("Freighter not found. Install it first.");
      const result = await requestAccess();
      const pk = result.address || result;
      if (!pk) throw new Error("Wallet access rejected");
      setWallet(pk);
      await fetchBalance(pk);
      addEvent(`✅ Connected: ${pk.slice(0, 8)}...`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const createEscrow = async () => {
    if (!escrowRecipient || !escrowAmount || !escrowWork) return alert("Fill all escrow fields!");
    try {
      setEscrowLoading(true); setEscrowHash("");
      addEvent("💼 Creating escrow...");
      const hash = await sendTx(wallet, [
        Operation.payment({ destination: escrowRecipient, asset: Asset.native(), amount: escrowAmount })
      ], `escrow:${escrowWork.slice(0, 20)}`);
      setEscrowHash(hash);
      setLoyaltyPoints(p => p + 10);
      addEvent(`✅ Escrow created: ${hash.slice(0, 12)}...`);
      setEscrowRecipient(""); setEscrowAmount(""); setEscrowWork("");
      await fetchBalance(wallet);
    } catch (e) { addEvent("❌ " + e.message); alert(e.message); }
    finally { setEscrowLoading(false); }
  };

  const sendRemittance = async () => {
    if (!remitRecipient || !remitAmount || !remitCountry) return alert("Fill all remittance fields!");
    try {
      setRemitLoading(true); setRemitHash("");
      addEvent("💸 Sending remittance...");
      const hash = await sendTx(wallet, [
        Operation.payment({ destination: remitRecipient, asset: Asset.native(), amount: remitAmount })
      ], `remit:${remitCountry}`);
      setRemitHash(hash);
      setLoyaltyPoints(p => p + 5);
      addEvent(`✅ Remittance sent: ${hash.slice(0, 12)}...`);
      setRemitRecipient(""); setRemitAmount(""); setRemitCountry("");
      await fetchBalance(wallet);
    } catch (e) { addEvent("❌ " + e.message); alert(e.message); }
    finally { setRemitLoading(false); }
  };

  const claimLoyalty = async () => {
    try {
      setLoyaltyLoading(true); setLoyaltyHash("");
      addEvent("🎁 Claiming TRUST tokens...");
      const hash = await sendTx(wallet, [
        Operation.payment({ destination: wallet, asset: Asset.native(), amount: "0.0000001" })
      ], "trustchain-loyalty-claim");
      setLoyaltyHash(hash);
      addEvent(`✅ TRUST tokens claimed: ${hash.slice(0, 12)}...`);
    } catch (e) { addEvent("❌ " + e.message); alert(e.message); }
    finally { setLoyaltyLoading(false); }
  };

  const issueCertificate = async () => {
    if (!certName || !certCourse || !certDate) return alert("Fill all certificate fields!");
    try {
      setCertLoading(true); setCertHash("");
      addEvent("🎓 Issuing certificate...");
      const certData = `cert:${certName}:${certCourse}:${certDate}`.slice(0, 28);
      const hash = await sendTx(wallet, [
        Operation.payment({ destination: wallet, asset: Asset.native(), amount: "0.0000001" })
      ], certData);
      setCertHash(hash);
      setLoyaltyPoints(p => p + 20);
      addEvent(`✅ Certificate issued: ${hash.slice(0, 12)}...`);
      setCertName(""); setCertCourse(""); setCertDate("");
    } catch (e) { addEvent("❌ " + e.message); alert(e.message); }
    finally { setCertLoading(false); }
  };

  const verifyCertificate = async () => {
    if (!verifyCert) return alert("Enter transaction hash to verify!");
    try {
      setVerifyResult("⏳ Verifying...");
      const res = await fetch(`${HORIZON_URL}/transactions/${verifyCert}`);
      const data = await res.json();
      if (data.memo && data.memo.startsWith("cert:")) {
        const parts = data.memo.split(":");
        setVerifyResult(`✅ VERIFIED!\n👤 Name: ${parts[1]}\n📚 Course: ${parts[2]}\n📅 Date: ${parts[3]}\n🔗 TX: ${verifyCert.slice(0, 12)}...`);
      } else if (data.hash) {
        setVerifyResult("⚠️ Transaction found but not a TrustChain certificate.");
      } else {
        setVerifyResult("❌ Certificate not found.");
      }
    } catch (e) { setVerifyResult("❌ Verification failed: " + e.message); }
  };

  const createCampaign = async () => {
    if (!campaignTitle || !campaignGoal || !campaignCreator) return alert("Fill all campaign fields!");
    try {
      setCampaignLoading(true); setCampaignHash("");
      addEvent("🌱 Funding campaign...");
      const hash = await sendTx(wallet, [
        Operation.payment({ destination: campaignCreator, asset: Asset.native(), amount: campaignDonate || "1" })
      ], `fund:${campaignTitle.slice(0, 20)}`);
      setCampaignHash(hash);
      setLoyaltyPoints(p => p + 15);
      addEvent(`✅ Campaign funded: ${hash.slice(0, 12)}...`);
      setCampaignTitle(""); setCampaignGoal(""); setCampaignDonate(""); setCampaignCreator("");
      await fetchBalance(wallet);
    } catch (e) { addEvent("❌ " + e.message); alert(e.message); }
    finally { setCampaignLoading(false); }
  };

  const S = {
    wrap: { fontFamily: "'DM Sans', Arial, sans-serif", maxWidth: 700, margin: "0 auto", padding: 16, background: "#0f0f1a", minHeight: "100vh", color: "#e2e8f0" },
    header: { textAlign: "center", padding: "24px 16px", background: "linear-gradient(135deg, #0f172a, #1e1b4b, #0f172a)", borderRadius: 20, marginBottom: 20, border: "1px solid #312e81" },
    card: { background: "#1a1a2e", border: "1px solid #2d2d5e", borderRadius: 16, padding: 20, marginBottom: 16 },
    input: { width: "100%", padding: "12px 14px", background: "#0f0f1a", border: "1px solid #312e81", borderRadius: 10, color: "#e2e8f0", fontSize: 14, boxSizing: "border-box", marginBottom: 10, outline: "none" },
    btn: (color) => ({ width: "100%", padding: "13px", background: color || "linear-gradient(135deg, #4f46e5, #7c3aed)", color: "white", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer", marginTop: 4 }),
    hash: { background: "#0f0f1a", border: "1px solid #312e81", borderRadius: 8, padding: 10, marginTop: 12, fontSize: 12, wordBreak: "break-all", color: "#a5b4fc" },
    tab: (active) => ({ flex: 1, padding: "10px 4px", border: "none", background: active ? "#1e1b4b" : "transparent", color: active ? "#a5b4fc" : "#64748b", borderRadius: 10, cursor: "pointer", fontSize: "clamp(10px, 2.5vw, 13px)", fontWeight: active ? 700 : 400, borderBottom: active ? "2px solid #6366f1" : "2px solid transparent", transition: "all 0.2s" }),
    label: { fontSize: 12, color: "#94a3b8", marginBottom: 6, display: "block" },
    result: { background: "#0f0f1a", border: "1px solid #22c55e", borderRadius: 8, padding: 12, marginTop: 12, fontSize: 13, whiteSpace: "pre-line", color: "#86efac" },
  };

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <h1 style={{ margin: 0, fontSize: "clamp(22px, 5vw, 32px)", background: "linear-gradient(135deg, #a5b4fc, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          🔗 TrustChain Pro
        </h1>
        <p style={{ margin: "8px 0 12px", color: "#94a3b8", fontSize: 13 }}>Complete DeFi Platform on Stellar Testnet</p>
        <div>
          {["💼 Escrow", "💸 Remittance", "🎁 Loyalty", "🎓 Certificate", "🌱 Crowdfunding"].map(f => (
            <span key={f} style={{ background: "rgba(99,102,241,0.2)", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600, marginRight: 4, display: "inline-block", marginTop: 4 }}>{f}</span>
          ))}
        </div>
      </div>

      {error && <div style={{ background: "#1a0000", border: "1px solid #ef4444", borderRadius: 10, padding: 12, marginBottom: 16, color: "#f87171", fontSize: 13 }}>{error}</div>}

      {!wallet ? (
        <div style={{ ...S.card, textAlign: "center" }}>
          <div style={{ background: "#0f0f1a", border: "1px solid #312e81", borderRadius: 12, padding: 16, marginBottom: 20, textAlign: "left" }}>
            <p style={{ margin: "0 0 10px", fontWeight: 700, fontSize: 14, color: "#a5b4fc" }}>🚀 First time? Setup in 3 steps:</p>
            <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 2, color: "#94a3b8" }}>
              <li>Install <a href="https://www.freighter.app/" target="_blank" rel="noreferrer" style={{ color: "#818cf8" }}>Freighter</a> Chrome extension</li>
              <li>Open Freighter → Settings → Switch to <b style={{ color: "#e2e8f0" }}>Testnet</b></li>
              <li>Get free XLM at <a href="https://friendbot.stellar.org" target="_blank" rel="noreferrer" style={{ color: "#818cf8" }}>Friendbot</a></li>
            </ol>
          </div>
          <button onClick={connectWallet} disabled={loading} style={{ ...S.btn(), maxWidth: 280, margin: "0 auto", display: "block", fontSize: 16 }}>
            {loading ? "Connecting..." : "🔌 Connect Wallet"}
          </button>
          <p style={{ color: "#475569", fontSize: 12, marginTop: 10 }}>Supports Freighter, xBull, Albedo</p>
        </div>
      ) : (
        <>
          <div style={{ ...S.card, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div>
              <p style={{ margin: 0, color: "#a5b4fc", fontSize: 13, fontWeight: 700 }}>✅ Wallet Connected</p>
              <p style={{ margin: "4px 0 0", fontSize: 11, color: "#475569", wordBreak: "break-all" }}>{wallet.slice(0, 20)}...{wallet.slice(-8)}</p>
              <p style={{ margin: "6px 0 0", fontSize: 22, fontWeight: 800, color: "#e2e8f0" }}>{balance} <span style={{ color: "#6366f1", fontSize: 16 }}>XLM</span></p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ background: "rgba(99,102,241,0.15)", border: "1px solid #4f46e5", borderRadius: 10, padding: "8px 14px", marginBottom: 8 }}>
                <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>TRUST Points</p>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#a5b4fc" }}>{loyaltyPoints} 🎁</p>
              </div>
              <button onClick={() => { setWallet(""); setBalance(""); setLoyaltyPoints(0); }} style={{ padding: "6px 14px", background: "#7f1d1d", color: "#fca5a5", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12 }}>
                Disconnect
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={S.tab(activeTab === t.id)}>{t.label}</button>
            ))}
          </div>

          {activeTab === "escrow" && (
            <div style={S.card}>
              <h3 style={{ margin: "0 0 4px", color: "#a5b4fc" }}>💼 Freelancer Escrow</h3>
              <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: 13 }}>Lock payment — released when work is approved on Stellar</p>
              <label style={S.label}>Freelancer Wallet Address</label>
              <input style={S.input} placeholder="G... (freelancer's testnet address)" value={escrowRecipient} onChange={e => setEscrowRecipient(e.target.value)} />
              <label style={S.label}>Payment Amount (XLM)</label>
              <input style={S.input} type="number" placeholder="e.g. 10" value={escrowAmount} onChange={e => setEscrowAmount(e.target.value)} />
              <label style={S.label}>Work Description</label>
              <input style={S.input} placeholder="e.g. Logo design, Website build..." value={escrowWork} onChange={e => setEscrowWork(e.target.value)} />
              <button onClick={createEscrow} disabled={escrowLoading} style={S.btn()}>
                {escrowLoading ? "⏳ Processing..." : "💼 Create Escrow & Release Payment"}
              </button>
              <p style={{ fontSize: 11, color: "#475569", marginTop: 8 }}>+10 TRUST points earned ✅</p>
              {escrowHash && (
                <div style={S.hash}>
                  <p style={{ margin: "0 0 4px", color: "#86efac", fontWeight: 700 }}>✅ Escrow Created!</p>
                  <p style={{ margin: "0 0 6px" }}>{escrowHash}</p>
                  <a href={`https://stellar.expert/explorer/testnet/tx/${escrowHash}`} target="_blank" rel="noreferrer" style={{ color: "#818cf8" }}>View on Stellar Explorer →</a>
                </div>
              )}
            </div>
          )}

          {activeTab === "remittance" && (
            <div style={S.card}>
              <h3 style={{ margin: "0 0 4px", color: "#34d399" }}>💸 Cross-Border Remittance</h3>
              <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: 13 }}>Send money internationally — fast, cheap, on Stellar</p>
              <label style={S.label}>Recipient Wallet Address</label>
              <input style={{ ...S.input, borderColor: "#065f46" }} placeholder="G... (recipient's testnet address)" value={remitRecipient} onChange={e => setRemitRecipient(e.target.value)} />
              <label style={S.label}>Amount (XLM)</label>
              <input style={{ ...S.input, borderColor: "#065f46" }} type="number" placeholder="e.g. 50" value={remitAmount} onChange={e => setRemitAmount(e.target.value)} />
              <label style={S.label}>Destination Country</label>
              <input style={{ ...S.input, borderColor: "#065f46" }} placeholder="e.g. India, Nigeria, Philippines..." value={remitCountry} onChange={e => setRemitCountry(e.target.value)} />
              <button onClick={sendRemittance} disabled={remitLoading} style={S.btn("linear-gradient(135deg, #059669, #047857)")}>
                {remitLoading ? "⏳ Sending..." : "💸 Send Remittance"}
              </button>
              <p style={{ fontSize: 11, color: "#475569", marginTop: 8 }}>+5 TRUST points ✅ | Memo: remit:[country]</p>
              {remitHash && (
                <div style={{ ...S.hash, borderColor: "#059669" }}>
                  <p style={{ margin: "0 0 4px", color: "#86efac", fontWeight: 700 }}>✅ Remittance Sent!</p>
                  <p style={{ margin: "0 0 6px" }}>{remitHash}</p>
                  <a href={`https://stellar.expert/explorer/testnet/tx/${remitHash}`} target="_blank" rel="noreferrer" style={{ color: "#34d399" }}>View on Stellar Explorer →</a>
                </div>
              )}
            </div>
          )}

          {activeTab === "loyalty" && (
            <div style={S.card}>
              <h3 style={{ margin: "0 0 4px", color: "#fb923c" }}>🎁 TRUST Token Loyalty Rewards</h3>
              <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: 13 }}>Earn TRUST tokens for every transaction</p>
              <div style={{ background: "#0f0f1a", border: "1px solid #c2410c", borderRadius: 12, padding: 20, textAlign: "center", marginBottom: 16 }}>
                <p style={{ margin: "0 0 4px", color: "#94a3b8", fontSize: 13 }}>Your TRUST Points</p>
                <p style={{ margin: 0, fontSize: 48, fontWeight: 900, color: "#fb923c" }}>{loyaltyPoints}</p>
                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 12 }}>Escrow +10 | Remittance +5 | Crowdfunding +15 | Certificate +20</p>
              </div>
              <button onClick={claimLoyalty} disabled={loyaltyLoading || loyaltyPoints === 0} style={S.btn("linear-gradient(135deg, #ea580c, #c2410c)")}>
                {loyaltyLoading ? "⏳ Claiming..." : loyaltyPoints === 0 ? "Use other features to earn points first!" : `🎁 Claim ${loyaltyPoints} TRUST Points On-chain`}
              </button>
              {loyaltyHash && (
                <div style={{ ...S.hash, borderColor: "#ea580c" }}>
                  <p style={{ margin: "0 0 4px", color: "#fdba74", fontWeight: 700 }}>✅ TRUST Tokens Claimed!</p>
                  <p style={{ margin: "0 0 6px" }}>{loyaltyHash}</p>
                  <a href={`https://stellar.expert/explorer/testnet/tx/${loyaltyHash}`} target="_blank" rel="noreferrer" style={{ color: "#fb923c" }}>View on Stellar Explorer →</a>
                </div>
              )}
            </div>
          )}

          {activeTab === "certificate" && (
            <div style={S.card}>
              <h3 style={{ margin: "0 0 4px", color: "#38bdf8" }}>🎓 On-chain Certificate</h3>
              <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: 13 }}>Issue & verify certificates permanently on Stellar blockchain</p>
              <div style={{ background: "#0f172a", border: "1px solid #0369a1", borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <p style={{ margin: "0 0 12px", fontWeight: 700, color: "#38bdf8", fontSize: 14 }}>📜 Issue Certificate</p>
                <label style={S.label}>Recipient Name</label>
                <input style={{ ...S.input, borderColor: "#0369a1" }} placeholder="e.g. John Doe" value={certName} onChange={e => setCertName(e.target.value)} />
                <label style={S.label}>Course / Achievement</label>
                <input style={{ ...S.input, borderColor: "#0369a1" }} placeholder="e.g. Stellar Developer" value={certCourse} onChange={e => setCertCourse(e.target.value)} />
                <label style={S.label}>Completion Date</label>
                <input style={{ ...S.input, borderColor: "#0369a1" }} type="date" value={certDate} onChange={e => setCertDate(e.target.value)} />
                <button onClick={issueCertificate} disabled={certLoading} style={S.btn("linear-gradient(135deg, #0284c7, #0369a1)")}>
                  {certLoading ? "⏳ Issuing..." : "🎓 Issue Certificate On-chain"}
                </button>
                {certHash && (
                  <div style={{ ...S.hash, borderColor: "#0284c7" }}>
                    <p style={{ margin: "0 0 4px", color: "#7dd3fc", fontWeight: 700 }}>✅ Certificate Issued! Save this TX hash:</p>
                    <p style={{ margin: "0 0 6px", color: "#38bdf8" }}>{certHash}</p>
                    <a href={`https://stellar.expert/explorer/testnet/tx/${certHash}`} target="_blank" rel="noreferrer" style={{ color: "#38bdf8" }}>View on Stellar Explorer →</a>
                  </div>
                )}
              </div>
              <div style={{ background: "#0f172a", border: "1px solid #0369a1", borderRadius: 10, padding: 16 }}>
                <p style={{ margin: "0 0 12px", fontWeight: 700, color: "#38bdf8", fontSize: 14 }}>🔍 Verify Certificate</p>
                <label style={S.label}>Transaction Hash</label>
                <input style={{ ...S.input, borderColor: "#0369a1" }} placeholder="Paste certificate TX hash..." value={verifyCert} onChange={e => setVerifyCert(e.target.value)} />
                <button onClick={verifyCertificate} style={S.btn("linear-gradient(135deg, #0369a1, #1e3a5f)")}>🔍 Verify Certificate</button>
                {verifyResult && <div style={S.result}>{verifyResult}</div>}
              </div>
            </div>
          )}

          {activeTab === "crowdfunding" && (
            <div style={S.card}>
              <h3 style={{ margin: "0 0 4px", color: "#4ade80" }}>🌱 Crowdfunding Campaign</h3>
              <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: 13 }}>Fund campaigns with XLM — transparent, on-chain milestone tracking</p>
              <label style={S.label}>Campaign Title</label>
              <input style={{ ...S.input, borderColor: "#166534" }} placeholder="e.g. Build a school in rural India" value={campaignTitle} onChange={e => setCampaignTitle(e.target.value)} />
              <label style={S.label}>Funding Goal (XLM)</label>
              <input style={{ ...S.input, borderColor: "#166534" }} type="number" placeholder="e.g. 1000" value={campaignGoal} onChange={e => setCampaignGoal(e.target.value)} />
              <label style={S.label}>Campaign Creator Wallet (receives funds)</label>
              <input style={{ ...S.input, borderColor: "#166534" }} placeholder="G... (creator's testnet address)" value={campaignCreator} onChange={e => setCampaignCreator(e.target.value)} />
              <label style={S.label}>Your Donation Amount (XLM)</label>
              <input style={{ ...S.input, borderColor: "#166534" }} type="number" placeholder="e.g. 5" value={campaignDonate} onChange={e => setCampaignDonate(e.target.value)} />
              <button onClick={createCampaign} disabled={campaignLoading} style={S.btn("linear-gradient(135deg, #16a34a, #166534)")}>
                {campaignLoading ? "⏳ Processing..." : "🌱 Fund This Campaign"}
              </button>
              <p style={{ fontSize: 11, color: "#475569", marginTop: 8 }}>+15 TRUST points ✅ | TX recorded on Stellar</p>
              {campaignHash && (
                <div style={{ ...S.hash, borderColor: "#16a34a" }}>
                  <p style={{ margin: "0 0 4px", color: "#86efac", fontWeight: 700 }}>✅ Campaign Funded!</p>
                  <p style={{ margin: "0 0 6px" }}>{campaignHash}</p>
                  <a href={`https://stellar.expert/explorer/testnet/tx/${campaignHash}`} target="_blank" rel="noreferrer" style={{ color: "#4ade80" }}>View on Stellar Explorer →</a>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <div style={S.card}>
        <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>⚡ Live Activity Feed</h3>
        {events.length === 0 ? (
          <p style={{ color: "#475569", fontSize: 13, margin: 0 }}>No activity yet — connect wallet and use features!</p>
        ) : events.map((e, i) => (
          <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid #1e293b", fontSize: 12, color: "#94a3b8" }}>{e}</div>
        ))}
      </div>

      <div style={{ background: "linear-gradient(135deg, #1e1b4b, #312e81)", border: "1px solid #4f46e5", borderRadius: 16, padding: 20, textAlign: "center" }}>
        <p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: 16 }}>🙏 Help improve TrustChain Pro!</p>
        <p style={{ margin: "0 0 14px", fontSize: 13, color: "#a5b4fc" }}>Share feedback & earn bonus TRUST points</p>
        <a href={GOOGLE_FORM_URL} target="_blank" rel="noreferrer"
          style={{ display: "inline-block", padding: "10px 28px", background: "white", color: "#4f46e5", borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
          📝 Fill Feedback Form
        </a>
      </div>
    </div>
  );
}

export default App;