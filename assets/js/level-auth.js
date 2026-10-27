let method = 'email';
let authMode = 'signin';
let pendingPhone = '';
let resendAt = 0;
const el = id => document.getElementById(id);
function authError(message) { el('authError').textContent = message; el('authError').classList.add('show'); }
function authMessage(message) { el('authSuccess').textContent = message; el('authSuccess').classList.add('show'); }
function resetMessages() { el('authError').classList.remove('show'); el('authSuccess').classList.remove('show'); }
function openAuth(mode) {
  authMode = mode || 'signin'; pendingPhone = ''; resetMessages();
  el('authForm').reset();
  el('authOverlay').classList.add('open'); document.body.style.overflow = 'hidden';
  setAuthMethod(method); el(method === 'phone' ? 'authPhone' : 'authEmail').focus();
}
function closeAuth() { el('authOverlay').classList.remove('open'); document.body.style.overflow = ''; }
function switchAuthMode() { openAuth(authMode === 'signin' ? 'signup' : 'signin'); }
function setAuthMethod(value) {
  method = value; pendingPhone = ''; resetMessages();
  el('emailFields').hidden = value !== 'email'; el('phoneFields').hidden = value !== 'phone';
  el('codeRow').hidden = true; el('authPhone').disabled = false;
  el('nameRow').hidden = !(value === 'email' && authMode === 'signup');
  el('authTitle').textContent = value === 'phone' ? 'Sign in with your phone' : authMode === 'signup' ? 'Create your Level account' : 'Sign in to Level';
  el('authSubtitle').textContent = value === 'phone' ? 'We will text you a one-time sign-in code.' : 'Access your Level account and dashboard';
  el('authSubmitBtn').textContent = value === 'phone' ? 'Send code' : authMode === 'signup' ? 'Create account' : 'Sign in';
  el('authSwitch').hidden = value === 'phone';
  el('authSwitch').innerHTML = authMode === 'signup' ? 'Already have an account? <a href="#" onclick="switchAuthMode();return false">Sign in</a>' : 'New to Level? <a href="#" onclick="switchAuthMode();return false">Create an account</a>';
  el('emailTab').setAttribute('aria-pressed', String(value === 'email'));
  el('phoneTab').setAttribute('aria-pressed', String(value === 'phone'));
}
async function submitAuth(event) {
  event.preventDefault(); resetMessages(); const button = el('authSubmitBtn'); button.disabled = true;
  try {
    if (method === 'phone') {
      if (pendingPhone) {
        const token = el('authCode').value.trim();
        if (!/^\d{6}$/.test(token)) throw new Error('Enter the 6-digit code from your text message.');
        const { error } = await levelClient.auth.verifyOtp({ phone: pendingPhone, token, type: 'sms' });
        if (error) throw error;
        location.href = 'dashboard.html'; return;
      }
      const phone = el('authPhone').value.replace(/[\s().-]/g, '');
      if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error('Include your country code, for example +1 followed by your US number.');
      if (Date.now() < resendAt) throw new Error('Please wait a minute before requesting another code.');
      const { error } = await levelClient.auth.signInWithOtp({ phone });
      if (error) throw error;
      pendingPhone = phone; resendAt = Date.now() + 60000;
      el('authPhone').disabled = true; el('codeRow').hidden = false;
      button.textContent = 'Verify code'; el('authCode').focus();
      authMessage('Code sent. Enter it below to finish signing in.');
    } else {
      const email = el('authEmail').value.trim(); const password = el('authPass').value;
      if (!el('authEmail').checkValidity() || !email) throw new Error('Enter a valid email address.');
      if (password.length < 8) throw new Error('Use a password with at least 8 characters.');
      const result = authMode === 'signup'
        ? await levelClient.auth.signUp({ email, password, options: { data: { full_name: el('authName').value.trim() }, emailRedirectTo: new URL('index.html', location.href).href } })
        : await levelClient.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (result.data.session) location.href = 'dashboard.html';
      else authMessage('Check your email to confirm your account, then return here to sign in.');
    }
  } catch (error) {
    const message = error.message || 'Could not sign in. Please try again.';
    authError(/phone.*disabled|unsupported.*phone|sms.*provider/i.test(message) ? 'Phone sign-in is not available yet. Please use email while text delivery is being set up.' : message);
  } finally { button.disabled = false; }
}
function renderUserSignedIn(user) {
  el('authBtns').style.display = 'none'; el('userPill').classList.add('show');
  const name = user.user_metadata?.full_name || user.phone || user.email || 'Member';
  el('uName').textContent = name.split(' ')[0]; el('uDropName').textContent = name;
  el('uDropEmail').textContent = user.email || user.phone || ''; el('uInitial').textContent = name.charAt(0).toUpperCase();
}
function toggleUserDrop() { el('uDrop').classList.toggle('open'); }
async function signOut() { try { await levelSignOut(); } catch (e) { openAuth('signin'); authError(e.message); } }
el('authForm').addEventListener('submit', submitAuth);
el('authClose').addEventListener('click', closeAuth);
el('authOverlay').addEventListener('click', e => { if (e.target === el('authOverlay')) closeAuth(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAuth(); });
document.addEventListener('click', e => {
  if (!el('userWrap').contains(e.target)) el('uDrop').classList.remove('open');
  if (!el('products-nav-wrap').contains(e.target)) el('products-nav-menu').style.display = 'none';
});
levelUser().then(user => { if (user) renderUserSignedIn(user); });
if (new URLSearchParams(location.search).get('signin') === '1') openAuth('signin');
