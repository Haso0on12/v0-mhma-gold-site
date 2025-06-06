import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

const DEFAULT_ADJUSTMENTS = { oz_buy: 0, oz_sell: 0, '24_buy': 0, '24_sell': 0, '22_buy': 0, '22_sell': 0, '21_buy': 0, '21_sell': 0, '18_buy': 0, '18_sell': 0 };

async function ensureDefaults() {
  try {
    const stored = await kv.get('adjustments');
    if (!stored) {
      await kv.set('adjustments', DEFAULT_ADJUSTMENTS);
      return DEFAULT_ADJUSTMENTS;
    }
    return stored;
  } catch (e) {
    console.error("ERROR in ensureDefaults():", e);
    throw e; // إعادة رمي الخطأ ليظهر في السجلّ
  }
}

export async function GET(request) {
  try {
    const adjustments = await ensureDefaults();
    return NextResponse.json(adjustments, { status: 200 });
  } catch (e) {
    console.error("ERROR in GET /api/adjustments:", e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    // اقرأ النصّ الخام أولًا لتشخيص مشكلات JSON
    const text = await request.text();
    console.log("Raw POST body:", text);

    const body = JSON.parse(text); 
    // تأكد أنّ body يحتوي على مفاتيح صحيحة قبل التحديث
    const allowedKeys = ['oz_buy', 'oz_sell', '24_buy', '24_sell', '22_buy', '22_sell', '21_buy', '21_sell', '18_buy', '18_sell'];
    const updates = {};

    for (const key of allowedKeys) {
      if (body.hasOwnProperty(key)) {
        const val = parseFloat(body[key]);
        if (!isNaN(val)) {
          updates[key] = val;
        }
      }
    }

    console.log("Parsed updates:", updates);

    // احصل على التعديلات الحالية
    const current = await ensureDefaults();
    const merged = { ...current, ...updates };
    // خزنّها في Redis
    await kv.set('adjustments', merged);

    console.log("Merged adjustments:", merged);
    return NextResponse.json({ status: 'ok', adjustments: merged }, { status: 200 });
  } catch (e) {
    console.error("ERROR in POST /api/adjustments:", e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
