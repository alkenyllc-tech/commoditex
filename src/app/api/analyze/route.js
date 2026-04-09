import { NextResponse } from "next/server";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const TODAY = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

// Run the full agentic web-search loop server-side
async function runWithSearch(apiKey, systemPrompt, userPrompt, maxTokens = 3000) {
  let messages = [{ role: "user", content: userPrompt }];

  for (let i = 0; i < 10; i++) {
    const res = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "interleaved-thinking-2025-05-14",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: maxTokens,
        system: systemPrompt,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages,
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Anthropic ${res.status}: ${txt.slice(0, 300)}`);
    }

    const data = await res.json();
    if (data.error) throw new Error(data.error.message || "API error");

    // Append assistant turn
    messages.push({ role: "assistant", content: data.content });

    if (data.stop_reason === "end_turn") {
      // Extract the final text block
      const text = data.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim();
      return text;
    }

    if (data.stop_reason === "tool_use") {
      // Feed back tool results so the model can continue
      const toolResults = data.content
        .filter((b) => b.type === "tool_use")
        .map((b) => ({
          type: "tool_result",
          tool_use_id: b.id,
          content: b.output ?? "Search completed, results available.",
        }));
      messages.push({ role: "user", content: toolResults });
      continue;
    }

    // Unexpected stop — try to grab any text
    const text = data.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
    if (text) return text;
    throw new Error(`Unexpected stop_reason: ${data.stop_reason}`);
  }
  throw new Error("Agentic loop exceeded max iterations");
}

function extractJSON(raw) {
  const stripped = raw.replace(/^```[a-z]*\n?/gim, "").replace(/\n?```$/gim, "").trim();
  // Try direct parse first
  try { return JSON.parse(stripped); } catch {}
  // Find the outermost { ... }
  const match = stripped.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`No JSON found. Raw: ${stripped.slice(0, 200)}`);
  return JSON.parse(match[0]);
}

export async function POST(req) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });

  let commodity;
  try {
    const body = await req.json();
    commodity = body.commodity;
    if (!commodity?.label) throw new Error("missing commodity");
  } catch (e) {
    return NextResponse.json({ error: `Invalid request: ${e.message}` }, { status: 400 });
  }

  const system = `You are a commodity market analyst with access to live web search. Today is ${TODAY}. 
Always search the web for real, current data before responding. 
After searching, respond with ONLY a raw JSON object — no markdown fences, no explanation, just the JSON.`;

  const user = `Search the web for LIVE, up-to-date information about ${commodity.label} (${commodity.symbol}) commodity markets RIGHT NOW on ${TODAY}.

Search for:
1. Current spot price of ${commodity.label} today
2. Latest ${commodity.label} news and market-moving events from the past 48 hours  
3. Technical analysis / trend for ${commodity.label}

Then respond with ONLY this JSON (no markdown, no extra text):
{
  "price": "current live price with unit e.g. $3,220/oz",
  "change_today": "today's change e.g. +1.2%",
  "change_week": "weekly change e.g. -0.8%",
  "market_sentiment": "bullish or bearish or neutral",
  "key_factors": ["real current factor 1", "real current factor 2", "real current factor 3"],
  "trend": "uptrend or downtrend or sideways",
  "signal": "BUY or SELL or HOLD",
  "confidence": "High or Medium or Low",
  "support_level": "current support level",
  "resistance_level": "current resistance level",
  "rsi_estimate": "estimated RSI and meaning",
  "catalysts": ["real upcoming event 1", "real upcoming event 2"],
  "analysis_summary": "3-4 sentences covering current price action, key drivers today, and near-term outlook based on live data",
  "risk_factors": ["current risk 1", "current risk 2"],
  "news": [
    {"headline": "real headline from past 48h", "summary": "what happened", "impact": "bullish or bearish or neutral", "impact_reason": "why it matters for price", "source": "publication name", "time_ago": "e.g. 3 hours ago"},
    {"headline": "real headline 2", "summary": "what happened", "impact": "bullish or bearish or neutral", "impact_reason": "why it matters", "source": "publication", "time_ago": "recency"},
    {"headline": "real headline 3", "summary": "what happened", "impact": "bullish or bearish or neutral", "impact_reason": "why it matters", "source": "publication", "time_ago": "recency"},
    {"headline": "real headline 4", "summary": "what happened", "impact": "bullish or bearish or neutral", "impact_reason": "why it matters", "source": "publication", "time_ago": "recency"}
  ]
}`;

  try {
    const rawText = await runWithSearch(apiKey, system, user);
    const parsed  = extractJSON(rawText);
    return NextResponse.json(parsed);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
