import https from "https";

const GOLDAPI_KEY = process.env.goldapi_jzk9smbg824oq_io;

export default function handler(req, res) {
  // 1) تعامل مع preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET,OPTIONS");
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // 2) هيدرات CORS للطلب الرئيسي
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  const options = {
    hostname: "www.goldapi.io",
    path: "/api/XAU/USD",
    method: "GET",
    headers: {
      "x-access-token": GOLDAPI_KEY,
      "Content-Type": "application/json"
    }
  };

  const goldReq = https.request(options, goldRes => {
    let data = "";
    goldRes.on("data", chunk => { data += chunk });
    goldRes.on("end", () => {
      try {
        const parsed = JSON.parse(data);
        res.setHeader("Content-Type", "application/json");
        return res.status(200).end(JSON.stringify(parsed));
      } catch (e) {
        console.error("JSON.parse failed:", e);
        return res.status(502).json({ error: "Bad response from GoldAPI" });
      }
    });
  });

  goldReq.on("error", err => {
    console.error("GoldAPI error:", err);
    return res.status(502).json({ error: "Failed to fetch GoldAPI" });
  });

  goldReq.end();
}
