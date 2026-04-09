"use client";
import { useState } from "react";

const COMMODITIES = [
  { id: "gold",        label: "Gold",            symbol: "XAU", emoji: "🥇" },
  { id: "silver",      label: "Silver",          symbol: "XAG", emoji: "🥈" },
  { id: "crude_oil",   label: "Crude Oil (WTI)", symbol: "WTI", emoji: "🛢️" },
  { id: "natural_gas", label: "Natural Gas",     symbol: "NG",  emoji: "🔥" },
  { id: "copper",      label: "Copper",          symbol: "HG",  emoji: "🔶" },
  { id: "wheat",       label: "Wheat",           symbol: "ZW",  emoji: "🌾" },
  { id: "corn",        label: "Corn",            symbol: "ZC",  emoji: "🌽" },
  { id: "soybeans",    label: "Soybeans",        symbol: "ZS",  emoji: "🫘" },
];

const SIGNAL_COLORS = {
  BUY:     { bg: "#0d3320", border: "#00e676", text: "#00e676" },
  SELL:    { bg: "#330d0d", border: "#ff1744", text: "#ff1744" },
  HOLD:    { bg: "#1a1a0d", border: "#ffd600", text: "#ffd600" },
  NEUTRAL: { bg: "#1a1a1a", border: "#666",    text: "#aaa"    },
};

const NEWS_IMPACT = {
  bullish: { bg: "#0d2218", border: "#00c853", text: "#00e676", label: "↑ BULLISH" },
  bearish: { bg: "#220d0d", border: "#c62828", text: "#ff5252", label: "↓ BEARISH" },
  neutral: { bg: "#181818", border: "#444",    text: "#888",    label: "— NEUTRAL" },
};

function parseSignal(t) {
  const u = (t || "").toUpperCase();
  if (u.includes("SELL")) return "SELL";
  if (u.includes("BUY"))  return "BUY";
  return "HOLD";
}
function parseImpact(t) {
  const l = (t || "").toLowerCase();
  if (l.includes("bullish") || l.includes("positive")) return "bullish";
  if (l.includes("bearish") || l.includes("negative")) return "bearish";
  return "neutral";
}

function Stat({ label, value, color = "#ccc" }) {
  return (
    <div>
      <div style={{ fontSize: 8, color: "#444", letterSpacing: "0.2em", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, color }}>{value}</div>
    </div>
  );
}

export default function Home() {
  const [selected,  setSelected]  = useState(null);
  const [cache,     setCache]     = useState({});
  const [loading,   setLoading]   = useState({});
  const [error,     setError]     = useState({});
  const [activeTab, setActiveTab] = useState("analysis");

  const load = async (commodity, force = false) => {
    setSelected(commodity.id);
    setActiveTab("analysis");
    if (cache[commodity.id] && !force) return;

    setLoading((l) => ({ ...l, [commodity.id]: true }));
    setError((e)   => ({ ...e, [commodity.id]: null }));

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commodity }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setCache((c) => ({ ...c, [commodity.id]: json }));
    } catch (err) {
      setError((e) => ({ ...e, [commodity.id]: err.message }));
    } finally {
      setLoading((l) => ({ ...l, [commodity.id]: false }));
    }
  };

  const sel      = COMMODITIES.find((c) => c.id === selected);
  const cur      = selected ? cache[selected] : null;
  const isLoad   = selected ? !!loading[selected] : false;
  const curErr   = selected ? error[selected] : null;
  const signal   = cur ? parseSignal(cur.signal || "") : "NEUTRAL";
  const sc       = SIGNAL_COLORS[signal];
  const curNews  = cur?.news || [];
  const bullishN = curNews.filter((a) => parseImpact(a.impact) === "bullish").length;
  const bearishN = curNews.filter((a) => parseImpact(a.impact) === "bearish").length;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#e0e0e0", fontFamily: "'Courier New', monospace" }}>

      {/* Header */}
      <div style={{ borderBottom: "1px solid #1c1c1c", padding: "14px 16px", display: "flex", alignItems: "center", gap: 10, background: "#0d0d0d", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ width: 30, height: 30, background: "linear-gradient(135deg,#d4a017,#8b5e00)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>📈</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.12em", color: "#fff" }}>COMMODITEX</div>
          <div style={{ fontSize: 8, color: "#444", letterSpacing: "0.18em" }}>AI SIGNALS · PRICES · NEWS</div>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 8, color: "#2a2a2a" }}>{new Date().toDateString().toUpperCase()}</div>
      </div>

      <div style={{ display: "flex" }}>

        {/* Sidebar */}
        <div style={{ width: 130, borderRight: "1px solid #181818", minHeight: "calc(100vh - 59px)", paddingTop: 12, flexShrink: 0, position: "sticky", top: 59, alignSelf: "flex-start" }}>
          <div style={{ fontSize: 8, color: "#2a2a2a", letterSpacing: "0.2em", padding: "0 10px 8px" }}>MARKETS</div>
          {COMMODITIES.map((c) => {
            const d   = cache[c.id];
            const sig = d ? parseSignal(d.signal || "") : null;
            const isSel = selected === c.id;
            return (
              <button key={c.id} onClick={() => load(c)}
                style={{ width: "100%", padding: "8px 10px", background: isSel ? "#141414" : "transparent", border: "none", borderLeft: isSel ? "2px solid #d4a017" : "2px solid transparent", color: isSel ? "#fff" : "#555", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                <span>{c.emoji}</span>
                <span style={{ flex: 1 }}>{c.label.split(" ")[0]}</span>
                {loading[c.id] && <span style={{ fontSize: 9, color: "#444", animation: "spin 1s linear infinite" }}>⟳</span>}
                {sig && !loading[c.id] && (
                  <span style={{ fontSize: 7, padding: "1px 3px", borderRadius: 2, background: SIGNAL_COLORS[sig].bg, color: SIGNAL_COLORS[sig].text, border: `1px solid ${SIGNAL_COLORS[sig].border}` }}>{sig}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Main panel */}
        <div style={{ flex: 1, padding: "16px 14px", minWidth: 0 }}>

          {/* Empty state */}
          {!selected && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 8, color: "#242424" }}>
              <div style={{ fontSize: 40 }}>📊</div>
              <div style={{ fontSize: 11, letterSpacing: "0.18em" }}>SELECT A MARKET</div>
              <div style={{ fontSize: 9 }}>Tap any commodity to load analysis</div>
            </div>
          )}

          {selected && sel && (
            <>
              {/* Title row */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 18 }}>{sel.emoji}</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{sel.label}</span>
                    <span style={{ fontSize: 8, color: "#3a3a3a", letterSpacing: "0.15em" }}>{sel.symbol}/USD</span>
                  </div>
                  {cur?.price && (
                    <div style={{ marginTop: 3, fontSize: 22, color: "#d4a017", fontWeight: 700 }}>
                      {cur.price}
                      {cur.change_today && (
                        <span style={{ fontSize: 10, marginLeft: 7, color: (cur.change_today||"").includes("-") ? "#ff5252" : "#00e676" }}>
                          {cur.change_today}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <button onClick={() => load(sel, true)} disabled={isLoad}
                  style={{ background: "transparent", border: "1px solid #282828", color: "#555", padding: "4px 9px", fontSize: 8, cursor: "pointer", borderRadius: 3, letterSpacing: "0.1em", flexShrink: 0 }}>
                  {isLoad ? "..." : "⟳ REFRESH"}
                </button>
              </div>

              {/* Loading */}
              {isLoad && (
                <div style={{ background: "#101010", border: "1px solid #1c1c1c", borderRadius: 4, padding: 28, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#444", letterSpacing: "0.15em", marginBottom: 4 }}>ANALYZING MARKET...</div>
                  <div style={{ fontSize: 9, color: "#222" }}>Fetching prices, signals & news</div>
                </div>
              )}

              {/* Error */}
              {curErr && !isLoad && (
                <div style={{ background: "#180a0a", border: "1px solid #3a1111", borderRadius: 4, padding: 14, marginBottom: 12 }}>
                  <div style={{ color: "#ff5252", fontSize: 11, marginBottom: 4 }}>⚠ Error</div>
                  <div style={{ color: "#772222", fontSize: 9, wordBreak: "break-all" }}>{curErr}</div>
                  <button onClick={() => load(sel, true)}
                    style={{ marginTop: 8, background: "#2a0a0a", border: "1px solid #551111", color: "#ff5252", padding: "4px 10px", fontSize: 9, cursor: "pointer", borderRadius: 3 }}>
                    Try Again
                  </button>
                </div>
              )}

              {/* Data */}
              {cur && !isLoad && (
                <>
                  {/* Tabs */}
                  <div style={{ display: "flex", borderBottom: "1px solid #1c1c1c", marginBottom: 14 }}>
                    {[{ id: "analysis", label: "📊 ANALYSIS" }, { id: "news", label: `📰 NEWS${curNews.length ? ` (${curNews.length})` : ""}` }].map((tab) => (
                      <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        style={{ padding: "6px 14px", background: "transparent", border: "none", borderBottom: activeTab === tab.id ? "2px solid #d4a017" : "2px solid transparent", color: activeTab === tab.id ? "#d4a017" : "#444", cursor: "pointer", fontSize: 9, letterSpacing: "0.15em", marginBottom: -1 }}>
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* ── Analysis ── */}
                  {activeTab === "analysis" && (
                    <>
                      <div style={{ background: sc.bg, border: `1px solid ${sc.border}`, borderRadius: 4, padding: "12px 14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ textAlign: "center", minWidth: 52 }}>
                          <div style={{ fontSize: 20, fontWeight: 900, color: sc.text }}>{signal}</div>
                          <div style={{ fontSize: 7, color: sc.text, opacity: 0.6, letterSpacing: "0.2em" }}>SIGNAL</div>
                        </div>
                        <div style={{ width: 1, height: 28, background: sc.border, opacity: 0.3 }} />
                        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                          {cur.confidence   && <Stat label="CONFIDENCE" value={cur.confidence} />}
                          {cur.trend        && <Stat label="TREND"      value={(cur.trend||"").toUpperCase()} />}
                          {cur.rsi_estimate && <Stat label="RSI"        value={cur.rsi_estimate} />}
                          {curNews.length > 0 && (
                            <Stat label="NEWS TONE"
                              value={bullishN > bearishN ? "↑ BULLISH" : bearishN > bullishN ? "↓ BEARISH" : "MIXED"}
                              color={bullishN > bearishN ? "#00e676" : bearishN > bullishN ? "#ff5252" : "#888"} />
                          )}
                        </div>
                      </div>

                      {(cur.support_level || cur.resistance_level) && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                          {cur.support_level && (
                            <div style={{ background: "#0d1a0d", border: "1px solid #1a3a1a", borderRadius: 4, padding: "9px 11px" }}>
                              <div style={{ fontSize: 7, color: "#444", letterSpacing: "0.2em", marginBottom: 3 }}>SUPPORT</div>
                              <div style={{ fontSize: 13, color: "#00e676" }}>{cur.support_level}</div>
                            </div>
                          )}
                          {cur.resistance_level && (
                            <div style={{ background: "#1a0d0d", border: "1px solid #3a1a1a", borderRadius: 4, padding: "9px 11px" }}>
                              <div style={{ fontSize: 7, color: "#444", letterSpacing: "0.2em", marginBottom: 3 }}>RESISTANCE</div>
                              <div style={{ fontSize: 13, color: "#ff5252" }}>{cur.resistance_level}</div>
                            </div>
                          )}
                        </div>
                      )}

                      {cur.analysis_summary && (
                        <div style={{ background: "#0e0e0e", border: "1px solid #1c1c1c", borderRadius: 4, padding: "11px 13px", marginBottom: 10 }}>
                          <div style={{ fontSize: 7, color: "#444", letterSpacing: "0.2em", marginBottom: 6 }}>TRADING THESIS</div>
                          <div style={{ fontSize: 11, color: "#999", lineHeight: 1.7 }}>{cur.analysis_summary}</div>
                        </div>
                      )}

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                        {cur.key_factors?.length > 0 && (
                          <div style={{ background: "#0e0e0e", border: "1px solid #1c1c1c", borderRadius: 4, padding: "9px 11px" }}>
                            <div style={{ fontSize: 7, color: "#444", letterSpacing: "0.2em", marginBottom: 5 }}>DRIVERS</div>
                            {cur.key_factors.map((f, i) => <div key={i} style={{ fontSize: 9, color: "#777", marginBottom: 4, paddingLeft: 6, borderLeft: "2px solid #2a2a2a" }}>{f}</div>)}
                          </div>
                        )}
                        {cur.catalysts?.length > 0 && (
                          <div style={{ background: "#0e0e0e", border: "1px solid #1c1c1c", borderRadius: 4, padding: "9px 11px" }}>
                            <div style={{ fontSize: 7, color: "#444", letterSpacing: "0.2em", marginBottom: 5 }}>CATALYSTS</div>
                            {cur.catalysts.map((c, i) => <div key={i} style={{ fontSize: 9, color: "#d4a017", marginBottom: 4, paddingLeft: 6, borderLeft: "2px solid #3a2e00" }}>{c}</div>)}
                          </div>
                        )}
                      </div>

                      {cur.risk_factors?.length > 0 && (
                        <div style={{ background: "#0e0e0e", border: "1px solid #1c1c1c", borderRadius: 4, padding: "9px 11px", marginBottom: 10 }}>
                          <div style={{ fontSize: 7, color: "#444", letterSpacing: "0.2em", marginBottom: 5 }}>RISKS</div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {cur.risk_factors.map((r, i) => (
                              <span key={i} style={{ fontSize: 9, color: "#ff5252", background: "#1a0a0a", border: "1px solid #3a1111", borderRadius: 3, padding: "2px 6px" }}>⚠ {r}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* ── News ── */}
                  {activeTab === "news" && (
                    <>
                      {curNews.length > 0 && (
                        <div style={{ background: "#0e0e0e", border: "1px solid #1c1c1c", borderRadius: 4, padding: "9px 12px", marginBottom: 10, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ fontSize: 7, color: "#444", letterSpacing: "0.2em" }}>SENTIMENT</span>
                          <span style={{ fontSize: 10, color: "#00e676" }}>↑ {bullishN} bullish</span>
                          <span style={{ fontSize: 10, color: "#ff5252" }}>↓ {bearishN} bearish</span>
                          <span style={{ fontSize: 10, color: "#444" }}>— {curNews.length - bullishN - bearishN} neutral</span>
                          <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: bullishN > bearishN ? "#00e676" : bearishN > bullishN ? "#ff5252" : "#888" }}>
                            {bullishN > bearishN ? "NET BULLISH" : bearishN > bullishN ? "NET BEARISH" : "MIXED"}
                          </span>
                        </div>
                      )}
                      {curNews.map((article, i) => {
                        const ic = NEWS_IMPACT[parseImpact(article.impact || "")];
                        return (
                          <div key={i} style={{ background: ic.bg, border: `1px solid ${ic.border}`, borderRadius: 4, padding: "11px 13px", marginBottom: 8 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 5 }}>
                              <div style={{ fontSize: 11, color: "#ddd", fontWeight: 600, lineHeight: 1.4, flex: 1 }}>{article.headline}</div>
                              <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                                <span style={{ fontSize: 8, padding: "2px 5px", borderRadius: 2, color: ic.text, border: `1px solid ${ic.border}` }}>{ic.label}</span>
                                {article.source && <span style={{ fontSize: 8, color: "#333" }}>{article.source}</span>}
                              </div>
                            </div>
                            {article.summary && <div style={{ fontSize: 10, color: "#666", lineHeight: 1.6, marginBottom: 5 }}>{article.summary}</div>}
                            {article.impact_reason && (
                              <div style={{ fontSize: 9, color: ic.text, opacity: 0.8, borderTop: `1px solid ${ic.border}`, paddingTop: 5, lineHeight: 1.5 }}>
                                💡 {article.impact_reason}
                              </div>
                            )}
                            {article.time_ago && <div style={{ fontSize: 8, color: "#2a2a2a", marginTop: 4 }}>{article.time_ago}</div>}
                          </div>
                        );
                      })}
                    </>
                  )}

                  <div style={{ fontSize: 8, color: "#1e1e1e", marginTop: 8, lineHeight: 1.6 }}>
                    ⚠ AI-generated analysis only. Not financial advice. Always consult a professional before trading.
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
