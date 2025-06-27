// src/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// TODO: Replace with your actual Supabase project URL and anon key
// You can find these in your Supabase project settings under "API"
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

if (!supabaseUrl || supabaseUrl === 'YOUR_SUPABASE_URL' || !supabaseAnonKey || supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY') {
    console.warn("Supabase URL or anon key is not set. Please update src/supabaseClient.ts");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
