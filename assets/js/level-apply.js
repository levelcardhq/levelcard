let appData = {};
let currentUser;
let submitting = false;
function showStep(id) {
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
window.addEventListener('load', async () => {
  currentUser = await levelUser();
  if (!currentUser) { location.replace('index.html?signin=1'); return; }
  document.getElementById('appName').value = currentUser.user_metadata?.full_name || '';
  document.getElementById('appEmail').value = currentUser.email || '';
});
function goStep2() {
  const name = document.getElementById('appName').value.trim();
  const email = document.getElementById('appEmail').value.trim();
  const business = document.getElementById('appBiz').value.trim();
  const error = document.getElementById('step1Error');
  error.style.display = 'block';
  if (!currentUser) { error.textContent = 'Please sign in before applying.'; return; }
  if (!name || !email || !business) { error.textContent = 'Please fill in all fields.'; return; }
  if (!document.getElementById('appEmail').checkValidity()) { error.textContent = 'Please enter a valid email address.'; return; }
  appData = { full_name: name, email, business_name: business };
  error.style.display = 'none'; showStep('step2');
}
async function handleAnswer(answer) {
  if (submitting) return;
  submitting = true;
  document.querySelectorAll('.choice-btn').forEach(b => b.disabled = true);
  document.getElementById('submitError').textContent = '';
  try {
    const user = await levelUser();
    if (!user) throw new Error('Your session expired. Please sign in again.');
    const { error } = await levelClient.from('level_applications').insert({ ...appData, user_id: user.id, has_business_funds: answer === 'yes' });
    if (error) {
      if (error.code === '23505') throw new Error('You already have an application. Check its status in your dashboard.');
      throw error;
    }
    // Keep the application result authoritative; a profile update is independent.
    await levelClient.from('level_profiles').upsert({ user_id: user.id, full_name: appData.full_name });
    showStep('stepSubmitted');
  } catch (error) {
    document.getElementById('submitError').textContent = error.message || 'Could not save your application. Please try again.';
  } finally {
    submitting = false;
    document.querySelectorAll('.choice-btn').forEach(b => b.disabled = false);
  }
}
