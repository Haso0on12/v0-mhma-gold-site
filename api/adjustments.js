// api/adjustments.js
import { kv } from '@vercel/kv';

const DEFAULT_ADJUSTMENTS = {
  oz_buy:  0,
  oz_sell: 0,
  "24_buy":  0,
  "24_sell": 0,
  "22_buy":  0,
  "22_sell": 0,
  "21_buy":  0,
  "21_sell": 0,
  "18_buy":  0,
  "18_sell": 0
};

async function ensureDefaults() {
  const stored = await kv.get('adjustments');
  if (!stored) {
    await kv.set('adjustments', DEFAULT_ADJUSTMENTS);
    return DEFAULT_ADJUSTMENTS;
  }
  return stored;
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const data = await ensureDefaults();
      return res.status(200).json(data);
    } else if (req.method === 'POST') {
      const incoming = await req.json();
      const current = await ensureDefaults();

      const allowedKeys = [
        'oz_buy', 'oz_sell',
        '24_buy', '24_sell',
        '22_buy', '22_sell',
        '21_buy', '21_sell',
        '18_buy', '18_sell'
      ];

      for (const key of allowedKeys) {
        if (incoming[key] !== undefined) {
          const num = parseFloat(incoming[key]);
          current[key] = isNaN(num) ? 0 : num;
        }
      }

      await kv.set('adjustments', current);
      return res.status(200).json({ status: 'ok', adjustments: current });
    } else {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
