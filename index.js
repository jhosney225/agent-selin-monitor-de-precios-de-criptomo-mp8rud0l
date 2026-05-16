
```javascript
import Anthropic from "@anthropic-ai/sdk";
import fetch from "node-fetch";

const client = new Anthropic();

// Store conversation history for multi-turn interaction
let conversationHistory = [];
let cryptoData = {};
let alertThresholds = {};

// Fetch current cryptocurrency prices
async function fetchCryptoPrices() {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,cardano&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true"
    );
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    cryptoData = await response.json();
    return cryptoData;
  } catch (error) {
    console.error("Error fetching prices:", error.message);
    // Return mock data for demonstration
    return {
      bitcoin: { usd: 42500, usd_market_cap: 830000000000, usd_24h_vol: 25000000000 },
      ethereum: { usd: 2250, usd_market_cap: 270000000000, usd_24h_vol: 12000000000 },
      cardano: { usd: 0.98, usd_market_cap: 35000000000, usd_24h_vol: 800000000 },
    };
  }
}

// Check if price alerts should be triggered
function checkAlerts() {
  const alerts = [];
  for (const [crypto, threshold] of Object.entries(alertThresholds)) {
    const price = cryptoData[crypto]?.usd;
    if (price) {
      if (price >= threshold.upper) {
        alerts.push(
          `⚠️ ALERT: ${crypto} price (${price.toFixed(2)}) exceeded upper threshold (${threshold.upper})`
        );
      } else if (price <= threshold.lower) {
        alerts.push(
          `⚠️ ALERT: ${crypto} price (${price.toFixed(2)}) fell below lower threshold (${threshold.lower})`
        );
      }
    }
  }
  return alerts;
}

// Format price data for display
function formatPriceData() {
  let formatted =
    "Current Cryptocurrency Prices:\n" +
    "================================\n";
  for (const [crypto, data] of Object.entries(cryptoData)) {
    formatted += `${crypto.toUpperCase()}:\n`;
    formatted += `  Price: $${data.usd.toFixed(2)}\n`;
    formatted += `  Market Cap: $${(data.usd_market_cap / 1000000000).toFixed(2)}B\n`;
    formatted += `  24h Volume: $${(data.usd_24h_vol / 1000000000).toFixed(2)}B\n`;
  }
  return formatted;
}

// Main conversation function with Claude
async function chat(userMessage) {
  // Add user message to history
  conversationHistory.push({
    role: "user",
    content: userMessage,
  });

  // Get current price data
  const priceData = formatPriceData();

  // Create system prompt with current context
  const systemPrompt = `You are a helpful cryptocurrency price monitor assistant. You help users track cryptocurrency prices and set price alerts.

${priceData}

Current Alert Thresholds:
${Object.keys(alertThresholds).length === 0 ? "No alerts set yet" : JSON.stringify(alertThresholds, null, 2)}

You can help users:
1. View current prices for Bitcoin, Ethereum, and Cardano
2. Set price alerts (upper and lower thresholds)
3. Remove alerts
4. Check price statistics
5. Monitor market trends

When a user wants to set an alert, ask for the cryptocurrency name and the upper/lower price thresholds.
When a user asks about prices, provide the current data.
Be conversational and helpful.`;

  try {
    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      system: systemPrompt,
      messages: conversationHistory,
    });

    const assistantMessage =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Add assistant response to history
    conversationHistory.push({
      role: "assistant",
      content: assistantMessage,
    });

    // Parse response for alert commands
    if (
      userMessage.toLowerCase().includes("alert") ||
      userMessage.toLowerCase().includes("set threshold")
    ) {
      // Parse alert settings from user message
      const bitcoinMatch = userMessage.match(/bitcoin.*?(\d+)/i);
      const ethereumMatch = userMessage.match(/ethereum.*?(\d+)/i);
      const cardanoMatch = userMessage.match(/cardano.*?(\d+)/i);

      if (bitcoinMatch) {
        const price = parseFloat(bitcoinMatch[1]);
        if (userMessage.toLowerCase().includes("below")) {
          alertThresholds.bitcoin = { ...alertThresholds.bitcoin, lower: price };
        } else {
          alertThresholds.bitcoin = { ...alertThresholds.bitcoin, upper: price };
        }
      }

      if (ethereumMatch) {
        const price = parseFloat(ethereumMatch[1]);
        if (userMessage.toLowerCase().includes("below")) {
          alertThresholds.ethereum = {
            ...alertThresholds.ethereum,
            lower: price,
          };
        } else {
          alertThresholds.ethereum = {
            ...alertThresholds.ethereum,
            upper: price,
          };
        }
      }

      if (cardanoMatch) {
        const price = parseFloat(cardanoMatch[1]);
        if (userMessage.toLowerCase().includes("below")) {
          alertThresholds.cardano = { ...alertThresholds.cardano, lower: price };
        } else {
          alert