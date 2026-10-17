// api/fampay/webhook.js
// Vercel serverless function (Node.js) — Receive Fampay webhooks and verify signature
// IMPORTANT: keep FAMPAY_WEBHOOK_SECRET only in server environment variables (do NOT commit real secret)

const crypto = require('crypto');

module.exports = async (req, res) => {
  // We need raw body for signature verification
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  const raw = req.body; // Vercel passes parsed JSON by default; to verify signature you must configure platform to give raw body OR compute signature differently.

  // If using Vercel, use `req.rawBody` if available, otherwise reconstruct from JSON
  const payloadBuffer = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));

  const signatureHeader = req.headers['x-fampay-signature'] || req.headers['x-signature'] || req.headers['x-hub-signature'];
  const secret = process.env.FAMPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('Webhook secret not configured');
    return res.status(500).send('webhook_secret_not_configured');
  }

  try {
    const expected = crypto.createHmac('sha256', secret).update(payloadBuffer).digest('hex');
    if (!signatureHeader || !crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected))) {
      console.warn('Invalid webhook signature', { signatureHeader, expected });
      return res.status(400).send('invalid_signature');
    }

    const event = JSON.parse(payloadBuffer.toString('utf8'));

    // idempotency: check event.id or event.data.id in your DB and skip if already processed
    // example event handling (structure may vary by provider)
    const eventType = event.type || (event.event && event.event.type) || 'payment.updated';
    console.log('Received event', eventType);

    if (eventType === 'payment.succeeded' || eventType === 'payment.success') {
      // update your payment/order record to success
      // credit wallet, generate receipt, etc.
      console.log('Payment succeeded', event);
    } else if (eventType === 'payment.failed') {
      console.log('Payment failed', event);
    } else {
      console.log('Unhandled event type', eventType);
    }

    // respond 200 so provider marks webhook delivered
    res.status(200).send('ok');
  } catch (err) {
    console.error('webhook processing error', err);
    res.status(500).send('webhook_error');
  }
};
