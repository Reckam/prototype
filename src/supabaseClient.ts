// src/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// --- WARNING ---
// The key below appears to be a 'service_role' key. This key bypasses all
// Row Level Security policies and should NEVER be exposed in a client-side
// application. For production, you MUST replace it with your public 'anon' key
// from your Supabase project's API settings.
const supabaseUrl = "https://svbdauqvxytghskgzlkk.supabase.co";
const supabaseAnonKey = "sbp_40be5c22f73bfb20102676c3bccdc74feb192115";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
