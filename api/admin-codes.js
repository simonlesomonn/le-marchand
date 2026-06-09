const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPA_URL, process.env.SUPA_SERVICE_KEY);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { adminToken, action, productId, code, codeId } = req.body;
  if (adminToken !== process.env.ADMIN_SECRET) return res.status(403).json({ error: 'Accès refusé.' });

  try {
    if (action === 'list') {
      const { data, error } = await supabase.from('codes').select('id,code,used,product_id').eq('product_id', productId).order('id');
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ codes: data });
    }
    if (action === 'add') {
      const { error } = await supabase.from('codes').insert({ product_id: productId, code, used: false });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true });
    }
    if (action === 'delete') {
      const { error } = await supabase.from('codes').delete().eq('id', codeId);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true });
    }
    res.status(400).json({ error: 'Action inconnue.' });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};
