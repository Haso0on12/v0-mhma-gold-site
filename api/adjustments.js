// api/adjustments.js

import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

// القيم الافتراضية عند أول مرة (إذا لم يكن هناك مفتاح 'adjustments' في KV)
const DEFAULT_ADJUSTMENTS = {
  oz_buy:    0,
  oz_sell:   0,
  "24_buy":  0,
  "24_sell": 0,
  "22_buy":  0,
  "22_sell": 0,
  "21_buy":  0,
  "21_sell": 0,
  "18_buy":  0,
  "18_sell": 0
};

// دالة تضمن وجود كائن 'adjustments' في KV بالقيم الافتراضية الأولى
async function ensureDefaults() {
  // نحاول جلب القيمة من KV
  const stored = await kv.get('adjustments');
  if (!stored) {
    // إذا لم توجد الكلمة المفتاحية، ننشئها بالقيم الافتراضية
    await kv.set('adjustments', DEFAULT_ADJUSTMENTS);
    return DEFAULT_ADJUSTMENTS;
  }
  return stored;
}

// عند طلب GET: نعيدّ القيم الحالية
export async function GET(request) {
  try {
    // نضمن وجود المفتاح أو ننشئه بالقيم الافتراضية
    const data = await ensureDefaults();
    return NextResponse.json(data);
  } catch (err) {
    console.error('Error fetching adjustments from KV:', err);
    return NextResponse.json({ error: 'فشل جلب التعديلات.' }, { status: 500 });
  }
}

// عند طلب POST: نستقبل JSON و نحدّث القيم في KV
export async function POST(request) {
  try {
    // نقرأ جسم الطلب كـ JSON
    const incoming = await request.json();

    // نتأكد أولًا من وجود القيم أو إنشائها بالقيم الافتراضية
    const current = await ensureDefaults();

    // قائمة المفاتيح المسموح بتعديلها فقط
    const allowedKeys = [
      'oz_buy', 'oz_sell',
      '24_buy', '24_sell',
      '22_buy', '22_sell',
      '21_buy', '21_sell',
      '18_buy', '18_sell'
    ];

    // نحدّث القيم الموجودة في current إذا وُجدت في incoming
    for (const key of allowedKeys) {
      if (incoming[key] !== undefined) {
        // نحول القيمة إلى رقم (أو 0 إن لم يكن رقمًا صالحًا)
        const num = parseFloat(incoming[key]);
        current[key] = isNaN(num) ? 0 : num;
      }
    }

    // ننشئ/نحدّث المفتاح في KV
    await kv.set('adjustments', current);

    return NextResponse.json({ status: 'ok', adjustments: current });
  } catch (err) {
    console.error('Error saving adjustments to KV:', err);
    return NextResponse.json({ error: 'فشل في حفظ التعديلات.' }, { status: 500 });
  }
}
