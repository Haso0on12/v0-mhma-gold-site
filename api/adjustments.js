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

// القيم الافتراضية
const DEFAULT_ADJUSTMENTS = {
  oz_buy: 0, oz_sell: 0,
  "24_buy": 0, "24_sell": 0,
  "22_buy": 0, "22_sell": 0,
  "21_buy": 0, "21_sell": 0,
  "18_buy": 0, "18_sell": 0,
};

async function ensureDefaults() {
  await ensureRedisConnection();
  const stored = await redisClient.get("adjustments");
  if (!stored) {
    await redisClient.set("adjustments", JSON.stringify(DEFAULT_ADJUSTMENTS));
    return DEFAULT_ADJUSTMENTS;
  }
  return JSON.parse(stored);
}

export default async function handler(req, res) {
  // 1) طلب preflight لـ CORS
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS_HEADERS);
    return res.end();
  }

  // 2) إعداد الهيدر العام لكل الاستجابات
  res.setHeader("Content-Type", "application/json");
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  try {
    if (req.method === "GET") {
      // إعادة القيم
      const adjustments = await ensureDefaults();
      return res.status(200).end(JSON.stringify(adjustments));
    }

    if (req.method === "POST") {
      // قراءة الجسم raw
      let raw = "";
      for await (const chunk of req) raw += chunk;
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        return res.status(400).end(JSON.stringify({ error: "Invalid JSON" }));
      }

      // تصفية المفاتيح
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

      // دمج مع القيم الحالية
      const current = await ensureDefaults();
      const merged = { ...current, ...updates };
      await ensureRedisConnection();
      await redisClient.set("adjustments", JSON.stringify(merged));

      return res.status(200).end(JSON.stringify({ status: "ok", adjustments: merged }));
    }

    // أي Method آخر غير GET/POST
    res.setHeader("Allow", "GET, POST, OPTIONS");
    return res.status(405).end(JSON.stringify({ error: `Method ${req.method} Not Allowed` }));
  } catch (e) {
    console.error(e);
    return res.status(500).end(JSON.stringify({ error: "Internal Server Error" }));
  }
}
