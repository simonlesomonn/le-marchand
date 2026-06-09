const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPA_URL,
  process.env.SUPA_SERVICE_KEY // service role key pour contourner RLS côté serveur
);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Champs manquants.' });
  if (password.length < 4) return res.status(400).json({ error: 'Mot de passe trop court.' });

  try {
    // Créer l'utilisateur via Supabase Auth (mot de passe hashé automatiquement)
    const email = `${username.toLowerCase()}@lemarchand.local`;
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { username },
      email_confirm: true
    });

    if (error) {
      if (error.message.includes('already registered')) return res.status(409).json({ error: 'Pseudo déjà pris.' });
      return res.status(400).json({ error: error.message });
    }

    res.status(200).json({ ok: true, userId: data.user.id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};
