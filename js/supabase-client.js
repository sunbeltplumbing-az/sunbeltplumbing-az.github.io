// ============================================
// Sunbelt Plumbing — Supabase Client
// ============================================
// Shared Supabase initialization. Loaded by both
// the public site (for reading active content) and
// the admin panel (for full CRUD operations).
//
// CONFIG: Fill in the two values below after creating
// the Supabase project. The ANON KEY is safe to expose
// in client-side code — RLS policies enforce security.
// ============================================

window.SUPABASE_CONFIG = {
  // TODO: Replace with your project URL from Supabase dashboard
  // Format: https://xxxxxxxxxxxxxxxxxxxx.supabase.co
  url: 'https://htrydsxjrtobxuhxhrfy.supabase.co',

  // TODO: Replace with your ANON (public) key from Supabase → Settings → API
  // It starts with 'eyJ...'. The anon key is safe for browser use — DO NOT
  // use the service_role key here, ever.
  anonKey: 'REPLACE_WITH_YOUR_ANON_KEY'
};

// Load Supabase JS from CDN and initialize client
(function() {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  script.onload = function() {
    try {
      window.supabase = window.supabase.createClient(
        window.SUPABASE_CONFIG.url,
        window.SUPABASE_CONFIG.anonKey,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        }
      );
      // Dispatch event so page scripts can react
      document.dispatchEvent(new CustomEvent('supabaseReady'));
    } catch (err) {
      console.error('[Supabase] init failed:', err);
    }
  };
  script.onerror = function() {
    console.error('[Supabase] failed to load SDK from CDN');
  };
  document.head.appendChild(script);
})();

// Helper: wait for supabase to be ready (returns a Promise)
window.supabaseReady = function() {
  return new Promise((resolve) => {
    if (window.supabase && typeof window.supabase.from === 'function') {
      resolve(window.supabase);
    } else {
      document.addEventListener('supabaseReady', function handler() {
        document.removeEventListener('supabaseReady', handler);
        resolve(window.supabase);
      });
    }
  });
};
