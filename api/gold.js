// api/gold.js
import https from "https";

const GOLDAPI_KEY = process.env.GOLDAPI_KEY;
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "x-access-token,Content-Type",
};

export default function handler(req, res) {
  // Preflight support
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS_HEADERS);
    return res.end();
  }
  // Apply CORS headers
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method !== "GET")
    return res.status(405).json({ error: "Method Not Allowed" });
  if (!GOLDAPI_KEY)
    return res.status(500).json({ error: "Missing GOLDAPI_KEY" });

  // helper to fetch one currency
  const fetchOne = (curr) =>
    new Promise((resolve, reject) => {
      const opts = {
        hostname: "www.goldapi.io",
        path: `/api/XAU/${curr}`,
        method: "GET",
        headers: {
          "x-access-token": GOLDAPI_KEY,
          "Content-Type": "application/json",
        },
      };
      const r = https.request(opts, (r2) => {
        let raw = "";
        r2.on("data", (c) => (raw += c));
        r2.on("end", () => {
          try { resolve(JSON.parse(raw)); }
          catch (e) { reject(e); }
        });
      });
      r.on("error", reject);
      r.end();
    });

  // fetch USD & SAR in parallel
  Promise.all([fetchOne("USD"), fetchOne("SAR")])
    .then(([usd, sar]) => res.status(200).json({ usd, sar }))
    .catch((err) => {
      console.error("GoldAPI error:", err);
      res.status(502).json({ error: "Failed to fetch GoldAPI" });
    });
}
