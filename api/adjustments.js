// api/adjustments.js

import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL;

// سطر لطباعة قيمة REDIS_URL للتأكد منها في السجل
console.log('DEBUG: REDIS_URL =', redisUrl);

if (!redisUrl) {
  console.error('ERROR: REDIS_URL is not set in environment variables');
}

let client;
async function getRedisClient() {
  if (!client) {
    try {
      client = createClient({ url: redisUrl });
      client.on('error', (err) => console.error('Redis Client Error', err));
      console.log('DEBUG: Connecting to Redis...'); // رسالة قبل الاتصال
      await client.connect();
      console.log('DEBUG: Redis connected successfully'); // رسالة بعد الاتصال
    } catch (err) {
      console.error('ERROR: Failed to connect to Redis:', err);
      throw err;
    }
  }
  return client;
}

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
  const redis = await getRedisClient();
  const raw = await redis.get('adjustments');
  if (!raw) {
    await redis.set('adjustments', JSON.stringify(DEFAULT_ADJUSTMENTS));
    return DEFAULT_ADJUSTMENTS;
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    return DEFAULT_ADJUSTMENTS;
  }
}

export default async function handler(req, res) {
  try {
    const redis = await getRedisClient();

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

      await redis.set('adjustments', JSON.stringify(current));
      return res.status(200).json({ status: 'ok', adjustments: current });

    } else {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
