// api/adjustments.js

import { kv } from "@vercel/kv";

const DEFAULT_ADJUSTMENTS = {
  oz_buy: 0,
  oz_sell: 0,
  "24_buy": 0,
  "24_sell": 0,
  "22_buy": 0,
  "22_sell": 0,
  "21_buy": 0,
  "21_sell": 0,
  "18_buy": 0,
  "18_sell": 0,
};

async function ensureDefaults() {
  try {
    const stored = await kv.get("adjustments");
    if (!stored) {
      console.log("No existing adjustments found in Redis → writing defaults.");
      await kv.set("adjustments", DEFAULT_ADJUSTMENTS);
      return DEFAULT_ADJUSTMENTS;
    }
    return stored;
  } catch (e) {
    console.error("ERROR in ensureDefaults():", e);
    throw e;
  }
}

export default async function handler(req, res) {
  // ندعم فقط الطريقتين GET وPOST
  if (req.method === "GET") {
    try {
      const adjustments = await ensureDefaults();
      // نرجّع كائن JSON
      res.setHeader("Content-Type", "application/json");
      res.statusCode = 200;
      return res.end(JSON.stringify(adjustments));
    } catch (e) {
      console.error("ERROR in GET /api/adjustments:", e);
      res.setHeader("Content-Type", "application/json");
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: "Internal Server Error" }));
    }

  } else if (req.method === "POST") {
    try {
      // 1) نقرأ جسم الطلب كاملاً من كائن req (IncomingMessage)
      let rawBody = "";
      for await (const chunk of req) {
        rawBody += chunk;
      }
      console.log("Raw POST body:", rawBody);

      // 2) نحاول تحليل الـ JSON
      let body;
      try {
        body = JSON.parse(rawBody);
      } catch (parseError) {
        console.error("JSON.parse failed:", parseError);
        res.setHeader("Content-Type", "application/json");
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: "Invalid JSON" }));
      }

      // 3) نفلتر المفاتيح المسموح بها فقط
      const allowedKeys = [
        "oz_buy",
        "oz_sell",
        "24_buy",
        "24_sell",
        "22_buy",
        "22_sell",
        "21_buy",
        "21_sell",
        "18_buy",
        "18_sell",
      ];
      const updates = {};
      for (const key of allowedKeys) {
        if (Object.prototype.hasOwnProperty.call(body, key)) {
          const val = parseFloat(body[key]);
          if (!isNaN(val)) {
            updates[key] = val;
          }
        }
      }
      console.log("Parsed updates:", updates);

      // 4) نقرأ القيم الحالية من Redis ثم ندمج التعديلات
      const current = await ensureDefaults();
      if (!current || typeof current !== "object") {
        console.error("Current adjustments invalid:", current);
        throw new Error("Bad data structure in Redis");
      }
      const merged = { ...current, ...updates };
      console.log("Merged adjustments:", merged);

      // 5) نخزن التعديلات الجديدة في Redis
      await kv.set("adjustments", merged);

      // 6) نرجّع استجابة نجاح مع التعديلات المدموجة
      res.setHeader("Content-Type", "application/json");
      res.statusCode = 200;
      return res.end(JSON.stringify({ status: "ok", adjustments: merged }));
    } catch (e) {
      console.error("ERROR in POST /api/adjustments:", e);
      res.setHeader("Content-Type", "application/json");
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: "Internal Server Error" }));
    }

  } else {
    // إذا استخدم المستخدم طريقة أخرى غير GET أو POST
    res.setHeader("Allow", "GET, POST");
    res.statusCode = 405;
    return res.end(`Method ${req.method} Not Allowed`);
  }
}
