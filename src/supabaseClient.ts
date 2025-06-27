// src/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// --- IMPORTANT ---
// The key you previously used was a 'service_role' key, which is not allowed for
// client-side access and caused the "Invalid API key" error.
// You must replace the placeholder below with your public 'anon' key.
// You can find this in your Supabase project's API settings page.
const supabaseUrl = "https://svbdauqvxytghskgzlkk.supabase.co";
const supabaseAnonKey = "YOUR_PUBLIC_ANON_KEY";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
