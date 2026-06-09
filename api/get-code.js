const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPA_URL, process.env.SUPA_SERVICE_KEY);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'Session manquante.' });

  try {
    // Vérifier que le paiement est confirmé sur Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') return res.status(402).json({ error: 'Paiement non confirmé.' });

    const productId = session.metadata.productId;

    // Vérifier si un code a déjà été attribué pour cette session
    const { data: existing } = await supabase
      .from('codes')
      .select('code')
      .eq('stripe_session_id', sessionId)
      .limit(1);

    if (existing && existing.length) {
      return res.status(200).json({ code: existing[0].code });
    }

    // Prendre un code disponible
    const { data: avail } = await supabase
      .from('codes')
      .select('id, code')
      .eq('product_id', productId)
      .eq('used', false)
      .limit(1);

    if (!avail || !avail.length) return res.status(404).json({ error: 'Plus de codes disponibles.' });

    const chosen = avail[0];

    // Marquer le code comme utilisé
    await supabase
      .from('codes')
      .update({ used: true, stripe_session_id: sessionId })
      .eq('id', chosen.id);

    // Décrémenter le stock
    const { data: prod } = await supabase
      .from('products')
      .select('qty')
      .eq('id', productId)
      .single();

    if (prod && prod.qty > 0) {
      await supabase
        .from('products')
        .update({ qty: prod.qty - 1 })
        .eq('id', productId);
    }

    res.status(200).json({ code: chosen.code });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};
