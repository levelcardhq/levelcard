/* LEVEL backend wiring (Supabase). Design-preserving: no visual changes except a
   "Continue with Google" button inside the existing sign-in modal.
   Loaded after each page's own scripts. When LEVEL_CONFIG has no keys yet,
   every override quietly falls back to the site's current browser-local behavior. */
(function () {
  'use strict';

  var CFG = window.LEVEL_CONFIG || {};
  var sb = null;
  var backendOn = false;
  if (CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase && window.supabase.createClient) {
    try {
      sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
      backendOn = true;
    } catch (e) { sb = null; }
  }

  /* ---- activity logging: everything people do, saved ---- */
  function logEvent(type, meta) {
    var row = {
      event_type: type,
      page: location.pathname.split('/').pop() || 'index.html',
      meta: meta || {},
      created_at: new Date().toISOString()
    };
    if (backendOn) {
      sb.from('events').insert(row).then(function () {}, function () {});
    }
    try {
      var q = JSON.parse(localStorage.getItem('level_event_queue') || '[]');
      q.push(row);
      localStorage.setItem('level_event_queue', JSON.stringify(q.slice(-500)));
    } catch (e) {}
  }

  function saveRow(table, row, cb) {
    row.created_at = new Date().toISOString();
    if (backendOn) {
      sb.from(table).insert(row).then(function (r) { if (cb) cb(!(r && r.error)); });
    } else if (cb) { cb(false); }
  }

  /* ---- session helpers ---- */
  function profileFromUser(u) {
    var md = u.user_metadata || {};
    return {
      name: md.full_name || md.name || '',
      email: u.email || '',
      picture: md.avatar_url || ''
    };
  }

  /* ---- index.html overrides (only when its functions exist) ---- */
  if (typeof window.handleEmailAuth === 'function') {
    var origHandleEmailAuth = window.handleEmailAuth;

    window.handleEmailAuth = function () {
      if (!backendOn) { origHandleEmailAuth(); return; }
      var errEl = document.getElementById('authError');
      errEl.classList.remove('show');
      var email = document.getElementById('authEmail').value.trim();
      var pass = document.getElementById('authPass').value;
      var name = document.getElementById('authName') ? document.getElementById('authName').value.trim() : '';
      if (!email || !email.includes('@')) { errEl.textContent = 'Please enter a valid email address.'; errEl.classList.add('show'); return; }
      if (!pass || pass.length < 6) { errEl.textContent = 'Password must be at least 6 characters.'; errEl.classList.add('show'); return; }
      var btn = document.getElementById('authSubmitBtn');
      btn.disabled = true; btn.style.opacity = '0.6';
      function fail(msg) { errEl.textContent = msg; errEl.classList.add('show'); btn.disabled = false; btn.style.opacity = ''; }
      if (authMode === 'signup') {
        sb.auth.signUp({ email: email, password: pass, options: { data: { full_name: name || email.split('@')[0] } } }).then(function (r) {
          if (r.error) { fail(r.error.message || 'Could not create account.'); return; }
          if (r.data && r.data.session) {
            logEvent('sign_up', { method: 'email' });
            window.saveAndLogin(profileFromUser(r.data.user));
          } else {
            btn.disabled = false; btn.style.opacity = '';
            var ok = document.getElementById('authSuccess');
            ok.textContent = 'Account created. Check your email to confirm, then sign in.';
            ok.classList.add('show');
          }
        });
      } else {
        sb.auth.signInWithPassword({ email: email, password: pass }).then(function (r) {
          if (r.error) { fail(r.error.message || 'Incorrect email or password.'); return; }
          logEvent('sign_in', { method: 'email' });
          window.saveAndLogin(profileFromUser(r.data.user));
        });
      }
    };

    // Returning visitors: render the signed-in pill from the Supabase session.
    window.addEventListener('load', function () {
      if (!backendOn) return;
      sb.auth.getSession().then(function (r) {
        var u = r && r.data && r.data.session && r.data.session.user;
        if (u) {
          localStorage.setItem('level_user', JSON.stringify(profileFromUser(u)));
          window.renderUserSignedIn(profileFromUser(u));
        } else {
          localStorage.removeItem('level_user');
        }
      });
      sb.auth.onAuthStateChange(function (event, session) {
        if (event === 'SIGNED_OUT') { localStorage.removeItem('level_user'); }
        if (session && session.user) {
          var p = profileFromUser(session.user);
          localStorage.setItem('level_user', JSON.stringify(p));
          window.renderUserSignedIn(p);
          if (event === 'SIGNED_IN' && session.user.app_metadata && session.user.app_metadata.provider === 'google') {
            logEvent('sign_in', { method: 'google' });
            if (location.pathname.split('/').pop() !== 'dashboard.html') window.location.href = 'dashboard.html';
          }
        }
      });
    });

    var origClearSession = window.clearSession;
    window.clearSession = function () {
      var done = backendOn ? (logEvent('sign_out', {}), sb.auth.signOut()) : Promise.resolve();
      origClearSession();
      return done;
    };

    // Google button inside the existing modal, styled to match it.
    function addGoogleButton() {
      if (CFG.GOOGLE_SIGNIN !== true) return; // hidden until Google provider is verified working end to end
      var body = document.querySelector('.auth-body');
      if (!body || document.getElementById('lvGoogleSignIn')) return;
      var style = document.createElement('style');
      style.textContent =
        '.btn-google-auth{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;background:#fff;' +
        'border:1.5px solid #e5e7eb;border-radius:10px;padding:12px;font-size:14.5px;font-weight:600;color:#1f2937;' +
        'cursor:pointer;font-family:\'Work Sans\',sans-serif;margin-bottom:4px;transition:background .15s;}' +
        '.btn-google-auth:hover{background:#f9fafb;}';
      document.head.appendChild(style);
      var frag = document.createElement('div');
      frag.innerHTML =
        '<button type="button" class="btn-google-auth" id="lvGoogleSignIn">' +
          '<svg width="17" height="17" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81z"/><path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.92l-3.87-3c-1.07.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.27 14.27A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.27v-3.1H1.29a12 12 0 0 0 0 10.74l3.98-3.1z"/><path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.44-3.44A11.98 11.98 0 0 0 12 0 12 12 0 0 0 1.29 6.63l3.98 3.1C6.22 6.88 8.87 4.77 12 4.77z"/></svg>' +
          'Continue with Google' +
        '</button>' +
        '<div class="or-divider">or</div>';
      var anchor = document.getElementById('nameRow');
      body.insertBefore(frag, anchor);
      document.getElementById('lvGoogleSignIn').addEventListener('click', function () {
        logEvent('auth_google_click', {});
        if (!backendOn) {
          var errEl = document.getElementById('authError');
          errEl.textContent = 'Google sign-in turns on when the site database is connected.';
          errEl.classList.add('show');
          return;
        }
        sb.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: location.href.split('#')[0] }
        }).then(function (r) {
          if (r.error) {
            var errEl = document.getElementById('authError');
            errEl.textContent = r.error.message || 'Google sign-in is not available yet.';
            errEl.classList.add('show');
          }
        });
      });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addGoogleButton);
    else addGoogleButton();

    // Save waitlist / newsletter / contact submissions to Supabase too
    // (the existing Formspree email notifications stay exactly as they are).
    window.addEventListener('load', function () {
      var wl = document.getElementById('waitlistForm');
      if (wl) wl.addEventListener('submit', function () {
        var em = wl.querySelector('[name="email"], input[type="email"]');
        if (em && em.value) { saveRow('waitlist', { email: em.value.trim() }); logEvent('waitlist_join', {}); }
      });
      var nl = document.getElementById('newsletterForm');
      if (nl) nl.addEventListener('submit', function () {
        var em = document.getElementById('newsletterEmail');
        if (em && em.value) { saveRow('waitlist', { email: em.value.trim() }); logEvent('newsletter_join', {}); }
      });
      var ct = document.getElementById('contactForm');
      if (ct) ct.addEventListener('submit', function () {
        var n = ct.querySelector('[name="name"]'), p = ct.querySelector('[name="phone"]');
        if (n && p && n.value && p.value) { saveRow('contact_messages', { name: n.value.trim(), phone: p.value.trim() }); logEvent('contact_submit', {}); }
      });
    });
  }

  // Every page: record the visit.
  logEvent('page_view', { title: document.title });

  window.LevelBackend = {
    on: function () { return backendOn; },
    client: function () { return sb; },
    logEvent: logEvent,
    saveRow: saveRow,
    user: function (cb) {
      if (!backendOn) {
        var s = localStorage.getItem('level_user');
        var u = null;
        if (s) { try { u = JSON.parse(s); } catch (e) {} }
        cb(u);
        return;
      }
      sb.auth.getUser().then(function (r) {
        var u = r && r.data && r.data.user;
        cb(u ? profileFromUser(u) : null);
      });
    },
    signOut: function () {
      var done = backendOn ? (logEvent('sign_out', {}), sb.auth.signOut()) : Promise.resolve();
      return done.then(function () {
        localStorage.removeItem('level_user');
      }, function () {
        localStorage.removeItem('level_user');
      });
    }
  };
})();
