import express from "express";
import axios from "axios";

const app = express();

const TROY_OUNCE_TO_GRAMS = 31.1034768;

// CONFIGURABLE
const IMPORT_DUTY = 0.15; // 15%
const DEALER_PREMIUM_PER_GRAM = 431; // adjust from your market
const SHOP_MARGIN_PER_GRAM = 0;

function round2(n) {
  return Math.round(n * 100) / 100;
}

app.get("/", (req, res) => {
  res.send("Gold Rate API is running. Access /api/gold-rates to get the rates.");
});

app.get("/api/gold-rates", async (req, res) => {
  try {
    // Swissquote Gold
    const goldResponse = await axios.get(
      "https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAU/USD"
    );

    const xauUsd = goldResponse.data[0].spreadProfilePrices[0].bid;

    // USD INR
    const fxResponse = await axios.get(
      "https://latest.currency-api.pages.dev/v1/currencies/usd.json"
    );

    const usdInr = fxResponse.data.usd.inr;

    // USD/Oz -> USD/g
    const usdPerGram = xauUsd / TROY_OUNCE_TO_GRAMS;

    // USD/g -> INR/g
    const inrPerGram = usdPerGram * usdInr;

    // Landed Cost
    const landedCost =
      inrPerGram * (1 + IMPORT_DUTY);

    // 24K Rate
    const rate24k =
      landedCost +
      DEALER_PREMIUM_PER_GRAM +
      SHOP_MARGIN_PER_GRAM;

    const rate22k = rate24k * (22 / 24);
    const rate18k = rate24k * (18 / 24);
    const rate14k = rate24k * (14 / 24);

    res.json({
      timestamp: new Date().toISOString(),

      source: {
        xauUsd,
        usdInr
      },

      ratesPerGram: {
        "24k": round2(rate24k),
        "22k": round2(rate22k),
        "18k": round2(rate18k),
        "14k": round2(rate14k)
      },

      ratesPer10Gram: {
        "24k": round2(rate24k * 10),
        "22k": round2(rate22k * 10),
        "18k": round2(rate18k * 10),
        "14k": round2(rate14k * 10)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Unable to fetch rates"
    });
  }
});

// Start the server if running locally
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Gold Rate Server Running on port ${PORT}`);
  });
}

// Export the Express API for Vercel
export default app;
