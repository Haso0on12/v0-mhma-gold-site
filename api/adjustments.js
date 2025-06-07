// api/adjustments.js

import { createClient } from "redis";

// === إعداد CORS ===
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",              // تسمح لأي دومين
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// إعداد عميل Redis
const redisClient = createClient({ url: process.env.REDIS_URL });
let isClientConnected = false;
async function ensureRedisConnection() {
  if (!isClientConnected) {
    await redisClient.connect();
    isClientConnected = true;
    console.log("✅ Connected to Redis");
  }
}

// القيم الافتراضية للتعديلات
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

// التأكد من وجود القيم في Redis أو تهيئتها
async function ensureDefaults() {
  await ensureRedisConnection();
  const stored = await redisClient.get("adjustments");
  if (!stored) {
    await redisClient.set("adjustments", JSON.stringify(DEFAULT_ADJUSTMENTS));
    return DEFAULT_ADJUSTMENTS;
  }
  try {
    return JSON.parse(stored);
  } catch {
    // إذا كانت البيانات تالفة، نعيد التهيئة
    await redisClient.set("adjustments", JSON.stringify(DEFAULT_ADJUSTMENTS));
    return DEFAULT_ADJUSTMENTS;
  }
}

export default async function handler(req, res) {
  // دعم طلبات الـ preflight الخاصة بـ CORS
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS_HEADERS);
    return res.end();
  }

  // إعداد هيدرات CORS والاستجابة JSON
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  res.setHeader("Content-Type", "application/json");

  try {
    if (req.method === "GET") {
      // إرجاع القيم المخزنة أو الافتراضية
      const adjustments = await ensureDefaults();
      return res.status(200).end(JSON.stringify(adjustments));
    }

    if (req.method === "POST") {
      // قراءة الجسم الخام
      let raw = "";
      for await (const chunk of req) raw += chunk;
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        return res.status(400).end(JSON.stringify({ error: "Invalid JSON" }));
      }

      // تصفية المفاتيح المسموحة
      const allowed = [
        "oz_buy","oz_sell",
        "24_buy","24_sell","22_buy","22_sell",
        "21_buy","21_sell","18_buy","18_sell"
      ];
      const updates = {};
      for (const key of allowed) {
        if (key in body) {
          const n = parseFloat(body[key]);
          if (!isNaN(n)) updates[key] = n;
        }
      }

      // دمج مع القيم الحالية وتحديث Redis
      const current = await ensureDefaults();
      const merged = { ...current, ...updates };
      await ensureRedisConnection();
      await redisClient.set("adjustments", JSON.stringify(merged));

      // العودة بالتحديثات
      return res.status(200).end(JSON.stringify({ status: "ok", adjustments: merged }));
    }

    // أي Method آخر غير GET/POST
    res.setHeader("Allow", "GET, POST, OPTIONS");
    return res.status(405).end(JSON.stringify({ error: `Method ${req.method} Not Allowed` }));
  } catch (e) {
    console.error("Adjustment API error:", e);
    return res.status(500).end(JSON.stringify({ error: "Internal Server Error" }));
  }
}
