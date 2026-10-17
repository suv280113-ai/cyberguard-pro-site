// api/fampay/create.js
// Vercel serverless function (Node.js) — Create a Fampay payment/order
// This function forwards a create request to the payment provider using server-side secret.

const fetch = require('node-fetch');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { amount, currency = 'INR', order_ref, metadata = {} } = req.body || {};
    if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'invalid amount' });

    const providerUrl = process.env.FAMPAY_PROVIDER_URL || 'https://fampay-flame.vercel.app/api/v1/fampay/create';
    const apiKey = process.env.FAMPAY_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'FAMPAY_API_KEY not configured on server' });

    const payload = { amount, currency, order_ref: order_ref || `CG-${Date.now()}`, metadata };

    const response = await fetch(providerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    const json = await response.json();

    // IMPORTANT: persist order locally in your DB here (order id, provider response, status: pending)

    return res.status(response.status).json(json);
  } catch (err) {
    console.error('create error', err);
    return res.status(500).json({ error: 'create_failed', detail: String(err) });
  }
};
