import { NextResponse } from "next/server";

const TODAY = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

async function runWithSearch(apiKey, prompt) {
  let messages = [{ role: "user", content: prompt }];

  for (let i = 0; i < 10; i++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
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

    messages.push({ role: "assistant", content: data.content });

    if (data.stop_reason === "end_turn") {
      return data.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
    }

    if (data.stop_reason === "tool_use") {
      const toolResults = data.content
        .filter((b) => b.type === "tool_use")
        .map((b) => ({ type: "tool_result", tool_use_id: b.id, content: b.output ?? "Search completed." }));
      messages.push({ role: "user", content: toolResults });
      continue;
    }

    const text = data.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
    if (text) return text;
    throw new Error(`Unexpected stop: ${data.stop_reason}`);
  }
  throw new Error("Too many iterations");
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

  const prompt = `Search the web for live current data on ${commodity.label} (${commodity.symbol}) commodity as of today ${TODAY}. Find the current spot price, today's price change, recent news from the past 48 hours, and technical analysis.

Then respond with ONLY this JSON, no markdown, no extra text:

{"price":"current live price","change_today":"today change %","change_week":"weekly change %","market_sentiment":"bullish or bearish or neutral","key_factors":["factor 1","factor 2","factor 3"],"trend":"uptrend or downtrend or sideways","signal":"BUY or SELL or HOLD","confidence":"High or Medium or Low","support_level":"support price","resistance_level":"resistance price","rsi_estimate":"RSI and meaning","catalysts":["event 1","event 2"],"analysis_summary":"3-4 sentence thesis based on live data","risk_factors":["risk 1","risk 2"],"news":[{"headline":"real headline","summary":"what happened","impact":"bullish or bearish or neutral","impact_reason":"why it matters","source":"publication","time_ago":"e.g. 2 hours ago"},{"headline":"headline 2","summary":"summary","impact":"bullish or bearish or neutral","impact_reason":"reason","source":"publication","time_ago":"timeframe"},{"headline":"headline 3","summary":"summary","impact":"bullish or bearish or neutral","impact_reason":"reason","source":"publication","time_ago":"timeframe"},{"headline":"headline 4","summary":"summary","impact":"bullish or bearish or neutral","impact_reason":"reason","source":"publication","time_ago":"timeframe"}]}`;

  try {
    const raw = await runWithSearch(apiKey, prompt);
    const stripped = raw.replace(/^```[a-z]*\n?/gim, "").replace(/\n?```$/gim, "").trim();
    let parsed;
    try {
      parsed = JSON.parse(stripped);
    } catch {
      const match = stripped.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Could not parse response");
      parsed = JSON.parse(match[0]);
    }
    return NextResponse.json(parsed);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
