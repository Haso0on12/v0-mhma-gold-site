// ====================================================
// api/gold.js
// ====================================================

// وظيفة بسيطة تعتمد على Node.js Native (IncomingMessage & ServerResponse)
// لجلب بيانات الذهب من GoldAPI

import https from "https";

// استخدم مفتاحك الخاص من goldapi.io
const GOLDAPI_KEY = process.env.GOLDAPI_KEY; 
// تأكّد من إضافة GOLDAPI_KEY في متغيّرات البيئة على Vercel

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.statusCode = 405;
    return res.end(`Method ${req.method} Not Allowed`);
  }

  // 1) إعداد خيارات طلب HTTPS إلى goldapi.io
  const options = {
    hostname: "www.goldapi.io",
    path: "/api/XAU/USD", // تحصل على سعر اونصة ذهب مقابل الدولار الأميركي
    method: "GET",
    headers: {
      "x-access-token": goldapi-jzk9smbg824oq-io,
      "Content-Type": "application/json"
    }
  };

  // 2) إنشاء الطلب
  const goldReq = https.request(options, (goldRes) => {
    let data = "";

    goldRes.on("data", (chunk) => {
      data += chunk;
    });

    goldRes.on("end", () => {
      try {
        const parsed = JSON.parse(data);
        // نعيد JSON كاملاً كما هو من goldapi.io
        res.setHeader("Content-Type", "application/json");
        res.statusCode = 200;
        return res.end(JSON.stringify(parsed));
      } catch (parseError) {
        console.error("JSON.parse failed in /api/gold:", parseError);
        res.setHeader("Content-Type", "application/json");
        res.statusCode = 502; // خطأ من طرف الجهة الخارجية بشكل أو بآخر
        return res.end(JSON.stringify({ error: "Failed to parse GoldAPI response" }));
      }
    });
  });

  goldReq.on("error", (err) => {
    console.error("GoldAPI request error:", err);
    res.setHeader("Content-Type", "application/json");
    res.statusCode = 502;
    return res.end(JSON.stringify({ error: "Failed to fetch from GoldAPI" }));
  });

  // إنهاء الطلب (GET لا يحتاج body)
  goldReq.end();
}
