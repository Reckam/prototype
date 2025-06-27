// src/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://svbdauqvxytghskgzlkk.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2YmRhdXF2eHl0Z2hza2d6bGtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MTExNjYsImV4cCI6MjA2NDI4NzE2Nn0.DDGkw1LfzOVX772-5tordvT0x7UX8U4cSZrPPPzrbYk";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
