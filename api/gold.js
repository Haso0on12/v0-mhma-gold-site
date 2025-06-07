// api/gold.js
import https from "https";

const GOLDAPI_KEY = process.env.GOLDAPI_KEY;
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "x-access-token,Content-Type",
};

export default function handler(req, res) {
  // دعم طلبات preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS_HEADERS);
    return res.end();
  }

  // إضافة هيدرات CORS لجميع الردود
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET,OPTIONS");
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  if (!GOLDAPI_KEY) {
    console.error("Missing GOLDAPI_KEY");
    return res.status(500).json({ error: "Server misconfiguration" });
  }

  // دالة مساعدة لجلب عملة واحدة (USD أو SAR) والتحقق من صحة JSON
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

      const goldReq = https.request(opts, (goldRes) => {
        let raw = "";
        goldRes.on("data", (chunk) => {
          raw += chunk;
        });
        goldRes.on("end", () => {
          // إذا لم يكن الكود 2xx، ارفع الخطأ مع المحتوى الخام
          if (goldRes.statusCode < 200 || goldRes.statusCode >= 300) {
            return reject(
              new Error(
                `GoldAPI ${currency} returned status ${goldRes.statusCode}: ${raw}`
              )
            );
          }

          // حاول تحويل السلسلة إلى JSON
          try {
            const json = JSON.parse(raw);
            resolve(json);
          } catch (err) {
            console.error("Invalid JSON from GoldAPI:", raw);
            reject(
              new Error(
                `Invalid JSON from GoldAPI for ${currency}: ${err.message}`
              )
            );
          }
        });
      });

      goldReq.on("error", (err) => {
        reject(new Error(`Network error fetching ${currency}: ${err.message}`));
      });

      goldReq.end();
    });

  // جلب USD و SAR بالتوازي
  Promise.all([fetchOne("USD"), fetchOne("SAR")])
    .then(([usd, sar]) => {
      res.status(200).json({ usd, sar });
    })
    .catch((err) => {
      console.error("GoldAPI error:", err);
      res.status(502).json({ error: err.message });
    });
}
