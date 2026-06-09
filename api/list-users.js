const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPA_URL, process.env.SUPA_SERVICE_KEY);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { adminToken } = req.body;
  if (adminToken !== process.env.ADMIN_SECRET) return res.status(403).json({ error: 'Accès refusé.' });

  try {
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) return res.status(500).json({ error: error.message });
    const users = data.users.map(u => ({ id: u.id, username: u.user_metadata?.username || u.email }));
    res.status(200).json({ users });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};
