// Supabase JS client (CDN, v2). config.js must load before this file.
const { createClient } = supabase;
const sb = createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_ANON_KEY);
