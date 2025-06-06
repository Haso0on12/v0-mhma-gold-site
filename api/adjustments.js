// ====================================================
// api/adjustments.js
// ====================================================

// استيراد مكتبة redis من npm
import { createClient } from "redis";

// تهيئة عميل Redis بناءً على متغير البيئة REDIS_URL
// تأكد أنك أضفت REDIS_URL في إعدادات الـ Environment Variables على Vercel
const redisClient = createClient({
  url: process.env.REDIS_URL
});

// علم لضمان الاتصال لمرة واحدة فقط
let isClientConnected = false;
async function ensureRedisConnection() {
  if (!isClientConnected) {
    try {
      await redisClient.connect();
      isClientConnected = true;
      console.log("✅ Connected to Redis via REDIS_URL");
    } catch (e) {
      console.error("❌ Failed to connect to Redis:", e);
      throw e;
    }
  }
}

// القيم الافتراضية في حالة عدم وجود مفتاح adjustments في Redis
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

// دالة لضمان وجود بيانات افتراضية في Redis (إن لم تكن موجودة مسبقًا)
async function ensureDefaults() {
  try {
    // 1) تأكد من الاتصال بقاعدة Redis
    await ensureRedisConnection();

    // 2) حاول جلب القيمة المخزنة تحت المفتاح "adjustments"
    const storedJson = await redisClient.get("adjustments");
    if (!storedJson) {
      // إذا لم توجد أيّة قيمة، اكتب القيم الافتراضية
      console.log("No existing adjustments in Redis → writing defaults.");
      await redisClient.set("adjustments", JSON.stringify(DEFAULT_ADJUSTMENTS));
      return DEFAULT_ADJUSTMENTS;
    }

    // إذا وُجد نصّ سابقًا، قم بتحويله إلى كائن وأعده
    return JSON.parse(storedJson);
  } catch (e) {
    console.error("ERROR in ensureDefaults():", e);
    throw e;
  }
}

// المعالج الرئيسي لصيغة Node.js (IncomingMessage & ServerResponse)
export default async function handler(req, res) {
  // 3) طريقة GET: إعادة القيم الحالية
  if (req.method === "GET") {
    try {
      const adjustments = await ensureDefaults();
      res.setHeader("Content-Type", "application/json");
      res.statusCode = 200;
      return res.end(JSON.stringify(adjustments));
    } catch (e) {
      console.error("ERROR in GET /api/adjustments:", e);
      res.setHeader("Content-Type", "application/json");
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: "Internal Server Error" }));
    }

  // 4) طريقة POST: تحديث القيم
  } else if (req.method === "POST") {
    try {
      // 4.1) قراءة الجسم الخام (raw) من req
      let rawBody = "";
      for await (const chunk of req) {
        rawBody += chunk;
      }
      console.log("Raw POST body:", rawBody);

      // 4.2) محاولة تحويل النص إلى JSON
      let body;
      try {
        body = JSON.parse(rawBody);
      } catch (parseError) {
        console.error("JSON.parse failed:", parseError);
        res.setHeader("Content-Type", "application/json");
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: "Invalid JSON" }));
      }

      // 4.3) تصفية المفاتيح المسموح بها
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
        "18_sell"
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

      // 4.4) جلب القيم الحالية ودمجها مع التحديثات
      const current = await ensureDefaults();
      if (!current || typeof current !== "object") {
        console.error("Current adjustments invalid:", current);
        throw new Error("Bad data structure in Redis");
      }
      const merged = { ...current, ...updates };
      console.log("Merged adjustments:", merged);

      // 4.5) تخزين القيم المحدثة في Redis
      await redisClient.set("adjustments", JSON.stringify(merged));

      // 4.6) إعادة الاستجابة بنجاح
      res.setHeader("Content-Type", "application/json");
      res.statusCode = 200;
      return res.end(JSON.stringify({ status: "ok", adjustments: merged }));

    } catch (e) {
      console.error("ERROR in POST /api/adjustments:", e);
      res.setHeader("Content-Type", "application/json");
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: "Internal Server Error" }));
    }

  // 5) في حال وصول طرق HTTP أخرى (PUT, DELETE, إلخ) نعيد 405
  } else {
    res.setHeader("Allow", "GET, POST");
    res.statusCode = 405;
    return res.end(`Method ${req.method} Not Allowed`);
  }
}
