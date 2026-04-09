import { NextResponse } from "next/server";

const TODAY = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

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

  const prompt = `You are a commodity market analyst. Today is ${TODAY}. Provide a realistic and detailed market briefing for ${commodity.label} (${commodity.symbol}) based on the most current market conditions and trends you know about.\n\nReturn ONLY a raw JSON object with no markdown, no code fences, no extra text:\n\n{"price":"realistic current price with unit","change_today":"realistic daily change %","change_week":"realistic weekly change %","market_sentiment":"bullish or bearish or neutral","key_factors":["real factor 1","real factor 2","real factor 3"],"trend":"uptrend or downtrend or sideways","signal":"BUY or SELL or HOLD","confidence":"High or Medium or Low","support_level":"realistic support price","resistance_level":"realistic resistance price","rsi_estimate":"realistic RSI value and meaning","catalysts":["real upcoming event 1","real upcoming event 2"],"analysis_summary":"3-4 sentences of realistic trading thesis","risk_factors":["real risk 1","real risk 2"],"news":[{"headline":"realistic recent headline","summary":"1-2 sentence summary","impact":"bullish or bearish or neutral","impact_reason":"why this matters for price","source":"real publication","time_ago":"recent timeframe"},{"headline":"second headline","summary":"summary","impact":"bullish or bearish or neutral","impact_reason":"reason","source":"publication","time_ago":"timeframe"},{"headline":"third headline","summary":"summary","impact":"bullish or bearish or neutral","impact_reason":"reason","source":"publication","time_ago":"timeframe"},{"headline":"fourth headline","summary":"summary","impact":"bullish or bearish or neutral","impact_reason":"reason","source":"publication","time_ago":"timeframe"}]}`;

  try {
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
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Anthropic ${res.status}: ${txt.slice(0, 300)}`);
    }

    const data = await res.json();
    if (data.error) throw new Error(data.error.message || "API error");

    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
    const stripped = text.replace(/^```[a-z]*\n?/gim, "").replace(/\n?```$/gim, "").trim();

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
