/* Public browser configuration. Never put service-role or SMS-provider secrets here. */
window.levelClient = supabase.createClient(
  'https://irxddahlcoxsepejwqpi.supabase.co',
  'sb_publishable_GsG7jD123jnZ2v7ZZiBJkg_7ruoEQ6F',
  { auth: { storageKey: 'level_supabase_session', persistSession: true, autoRefreshToken: true } }
);
// Retire the old browser-only account store; it is never accepted as authentication.
localStorage.removeItem('level_accounts');
localStorage.removeItem('level_user');
window.levelUser = async function () {
  const { data, error } = await levelClient.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
};
window.levelSignOut = async function () {
  const { error } = await levelClient.auth.signOut();
  if (error) throw error;
  location.href = 'index.html';
};
