// ====================================================
// api/adjustments.js
// ====================================================

// 1) استيراد مكتبة redis الأصلية من npm
import { createClient } from "redis";

// 2) تهيئة عميل Redis عبر REDIS_URL (تأكّد أنك أضفته في متغيرات Vercel)
const redisClient = createClient({
  url: process.env.REDIS_URL
});

// 3) علم لتجنُّب إعادة الاتصال في كل مرّة
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
    // 4) تأكد من الاتصال بقاعدة Redis
    await ensureRedisConnection();

    // 5) اجلب القيمة الموجودة تحت المفتاح "adjustments"
    const storedJson = await redisClient.get("adjustments");
    if (!storedJson) {
      // إذا لم يكن هناك قيمة، اكتب القيم الافتراضية
      console.log("No existing adjustments in Redis → writing defaults.");
      await redisClient.set("adjustments", JSON.stringify(DEFAULT_ADJUSTMENTS));
      return DEFAULT_ADJUSTMENTS;
    }

    // إذا وُجد نصّ، قم بتحويله إلى ك
