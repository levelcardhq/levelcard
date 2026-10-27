window.addEventListener('load', async () => {
  const banner = document.getElementById('notApprovedBanner');
  const showStatus = message => {
    banner.style.display = 'flex';
    banner.querySelector('h3').textContent = message;
    banner.querySelector('p').textContent = 'Your account and application information are saved securely with Level.';
    banner.querySelector('a').hidden = true;
  };
  try {
    const user = await levelUser();
    if (!user) { location.replace('index.html?signin=1'); return; }
    const profile = await levelClient.from('level_profiles').select('full_name').eq('user_id', user.id).maybeSingle();
    if (profile.error) throw profile.error;
    const name = profile.data?.full_name || user.user_metadata?.full_name || user.phone || user.email || 'Member';
    const hour = new Date().getHours();
    document.getElementById('greetingText').textContent = (hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening') + ', ' + name.split(' ')[0];
    document.getElementById('dateText').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('sbAvatar').textContent = name.charAt(0).toUpperCase();
    document.getElementById('sbName').textContent = name.split(' ')[0];
    const { data, error } = await levelClient.from('level_applications').select('status').eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    if (data) showStatus('Application: ' + data.status.replaceAll('_', ' '));
    else banner.style.display = 'flex';
    // A submitted or approved application is not proof of a funded financial balance.
  } catch (error) { showStatus('Unable to load your application. Please refresh to try again.'); }
});
async function signOut() {
  try { await levelSignOut(); }
  catch (error) { alert('Unable to sign out. Please try again.'); }
}
