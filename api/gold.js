// api/gold.js

import https from "https";

// استخدم هذه المتغيّر في إعدادات Vercel (Environment Variables)
const GOLDAPI_KEY = process.env.GOLDAPI_KEY;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default function handler(req, res) {
  // 1) دعم طلبات preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS_HEADERS);
    return res.end();
  }

  // 2) السماح بـ CORS على جميع الردود
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET,OPTIONS");
    return res.status(405).end(JSON.stringify({ error: `Method ${req.method} Not Allowed` }));
  }

  if (!GOLDAPI_KEY) {
    console.error("Missing GOLDAPI_KEY");
    return res.status(500).end(JSON.stringify({ error: "Server misconfiguration" }));
  }

  // 3) نرسل الطلب الخارجي لـ GoldAPI
  const options = {
    hostname: "www.goldapi.io",
    path: "/api/XAU/SAR",    // يمكنك أيضاً XAU/USD حسب الحاجة
    method: "GET",
    headers: {
      "x-access-token": GOLDAPI_KEY,
      "Content-Type": "application/json"
    }
  };

  const goldReq = https.request(options, (goldRes) => {
    let data = "";
    goldRes.on("data", chunk => { data += chunk; });
    goldRes.on("end", () => {
      try {
        const payload = JSON.parse(data);
        res.setHeader("Content-Type", "application/json");
        return res.status(200).end(JSON.stringify(payload));
      } catch (err) {
        console.error("Failed to parse GoldAPI response:", err);
        return res.status(502).end(JSON.stringify({ error: "Invalid response from GoldAPI" }));
      }
    });
  });

  goldReq.on("error", (err) => {
    console.error("Error fetching GoldAPI:", err);
    res.setHeader("Content-Type", "application/json");
    return res.status(502).end(JSON.stringify({ error: "Failed to fetch GoldAPI" }));
  });

  goldReq.end();
}
