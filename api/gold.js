// api/gold.js
import https from "https";

const GOLDAPI_KEY = process.env.GOLDAPI_KEY;
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "x-access-token,Content-Type",
};

export default function handler(req, res) {
  // Preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS_HEADERS);
    return res.end();
  }

  // Allow CORS on all responses
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET,OPTIONS");
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
  if (!GOLDAPI_KEY) {
    console.error("Missing GOLDAPI_KEY");
    return res.status(500).json({ error: "Server misconfiguration" });
  }

  // Helper to fetch from GoldAPI
  const fetchOne = (currency) =>
    new Promise((resolve, reject) => {
      const opts = {
        hostname: "www.goldapi.io",
        path: `/api/XAU/${currency}`,
        method: "GET",
        headers: {
          "x-access-token": GOLDAPI_KEY,
          "Content-Type": "application/json",
        },
      };
      const req2 = https.request(opts, (r2) => {
        let raw = "";
        r2.on("data", (c) => (raw += c));
        r2.on("end", () => {
          try {
            resolve(JSON.parse(raw));
          } catch (e) {
            reject(e);
          }
        });
      });
      req2.on("error", reject);
      req2.end();
    });

  // Fetch USD + SAR in parallel
  Promise.all([fetchOne("USD"), fetchOne("SAR")])
    .then(([usd, sar]) => {
      return res.status(200).json({ usd, sar });
    })
    .catch((err) => {
      console.error("GoldAPI error:", err);
      res.status(502).json({ error: "Failed to fetch GoldAPI" });
    });
}
