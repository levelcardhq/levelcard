# Level Supabase connection

Project: `irxddahlcoxsepejwqpi` in SWE, separate from Orbit.

The frontend uses a public publishable key, Supabase Auth sessions, and private `level_profiles` / `level_applications` tables. Old `level_accounts` and `level_user` browser stores are removed; existing browser-only accounts are not migrated. Users must register a real Supabase account.

## Remaining dashboard configuration

1. Authentication > URL Configuration: set Site URL to the actual Level production URL and allow the exact `index.html` confirmation redirect URL. The existing apparent domain is `https://levelcardhq.github.io`; confirm the actual GitHub Pages path before changing these settings.
2. Authentication > Providers > Phone: enable phone authentication and configure an SMS provider (for example Twilio). Provider credentials belong only in Supabase, never GitHub or browser JavaScript. SMS charges require the owner's approval.
3. For testing, add a test phone/code in Supabase; never commit fixed production bypass codes.
4. Configure rate limits and CAPTCHA before opening SMS signup publicly. If CAPTCHA is enabled, add its widget and pass the challenge token to the sign-in calls.
5. Test a real signup, confirmation, sign-in, logout, and private application save on the production domain. Phone sending and verification are not yet verified against live SMS.

## Application behavior

Applications are saved once per authenticated user with `submitted` status. Clients cannot change review status or award themselves a balance/grant. The dashboard shows status from Supabase; no financial funding is inferred from approval. Existing marketing copy is unchanged.

## Validation

JavaScript syntax checks; Node flow tests with mocked Auth/REST responses; database transaction test of owner access, cross-user isolation, anonymous denial, and denied client approval. Test fixtures are rolled back. Supabase security advisor returns no findings.

Browser end-to-end testing was blocked because Chromium could not be downloaded in this environment. Live SMS has not been tested.

The vendored browser client is `@supabase/supabase-js` 2.49.1 (UMD build), with its upstream MIT license. Realtime is not used. Upgrade the vendored version deliberately and re-run authentication tests.
