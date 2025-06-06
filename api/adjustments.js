import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const DEFAULT_ADJUSTMENTS = {
  oz_buy: 0, oz_sell: 0,
  "24_buy": 0, "24_sell": 0,
  "22_buy": 0, "22_sell": 0,
  "21_buy": 0, "21_sell": 0,
  "18_buy": 0, "18_sell": 0
};

async function ensureDefaults() {
  try {
    const stored = await kv.get("adjustments");
    if (!stored) {
      console.log("No existing adjustments found in Redis—writing defaults.");
      await kv.set("adjustments", DEFAULT_ADJUSTMENTS);
      return DEFAULT_ADJUSTMENTS;
    }
    return stored;
  } catch (e) {
    console.error("ERROR in ensureDefaults():", e);
    throw e;
  }
}

export async function GET(request) {
  try {
    const adjustments = await ensureDefaults();
    return NextResponse.json(adjustments, { status: 200 });
  } catch (e) {
    console.error("ERROR in GET /api/adjustments:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    // 1. قراءة الجسم الخام كـ نص
    const rawBody = await request.text();
    console.log("Raw POST body:", rawBody);

    // 2. محاولة تحليل JSON من النص
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (parseError) {
      console.error("JSON.parse failed:", parseError);
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // 3. تصفية المفاتيح المسموح بها
    const allowed = [
      "oz_buy","oz_sell",
      "24_buy","24_sell",
      "22_buy","22_sell",
      "21_buy","21_sell",
      "18_buy","18_sell"
    ];
    const updates = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        const val = parseFloat(body[key]);
        if (!isNaN(val)) {
          updates[key] = val;
        }
      }
    }
    console.log("Parsed updates:", updates);

    // 4. جلب القيم الحالية وتحديثها
    const current = await ensureDefaults();
    if (!current || typeof current !== "object") {
      console.error("Current adjustments invalid:", current);
      throw new Error("Bad data structure in Redis");
    }
    const merged = { ...current, ...updates };
    console.log("Merged adjustments:", merged);

    // 5. خزنّ القيم الجديدة في Redis
    await kv.set("adjustments", merged);
    return NextResponse.json({ status: "ok", adjustments: merged }, { status: 200 });
  } catch (e) {
    console.error("ERROR in POST /api/adjustments:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
