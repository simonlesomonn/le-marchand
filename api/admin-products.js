const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPA_URL, process.env.SUPA_SERVICE_KEY);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { adminToken, action, id, ...fields } = req.body;
  if (adminToken !== process.env.ADMIN_SECRET) return res.status(403).json({ error: 'Accès refusé.' });

  try {
    if (action === 'add') {
      const { error } = await supabase.from('products').insert(fields);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true });
    }
    if (action === 'update') {
      const { error } = await supabase.from('products').update(fields).eq('id', id);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true });
    }
    if (action === 'delete') {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true });
    }
    res.status(400).json({ error: 'Action inconnue.' });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};
