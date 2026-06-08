const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const SUPA_URL = process.env.SUPA_URL;
const SUPA_KEY = process.env.SUPA_KEY;
const H = { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json' };

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'Session manquante.' });

  try {
    // Vérifier que le paiement est bien confirmé sur Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') return res.status(402).json({ error: 'Paiement non confirmé.' });

    const productId = session.metadata.productId;

    // Chercher si un code a déjà été attribué pour cette session
    const existingRes = await fetch(
      `${SUPA_URL}/rest/v1/codes?stripe_session_id=eq.${sessionId}&select=code`,
      { headers: H }
    );
    const existing = await existingRes.json();
    if (existing.length) return res.status(200).json({ code: existing[0].code, productName: session.metadata?.productName });

    // Prendre un code disponible et le marquer comme utilisé
    const availRes = await fetch(
      `${SUPA_URL}/rest/v1/codes?product_id=eq.${productId}&used=eq.false&select=id,code&limit=1`,
      { headers: H }
    );
    const avail = await availRes.json();
    if (!avail.length) return res.status(404).json({ error: 'Plus de codes disponibles.' });

    const chosen = avail[0];
    await fetch(`${SUPA_URL}/rest/v1/codes?id=eq.${chosen.id}`, {
      method: 'PATCH',
      headers: { ...H, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ used: true, stripe_session_id: sessionId })
    });

    // Mettre à jour le stock du produit
    const prodRes = await fetch(`${SUPA_URL}/rest/v1/products?id=eq.${productId}&select=qty`, { headers: H });
    const prod = await prodRes.json();
    if (prod.length && prod[0].qty > 0) {
      await fetch(`${SUPA_URL}/rest/v1/products?id=eq.${productId}`, {
        method: 'PATCH',
        headers: { ...H, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ qty: prod[0].qty - 1 })
      });
    }

    res.status(200).json({ code: chosen.code });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};
