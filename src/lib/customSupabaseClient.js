import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zfhphlgrjylknokbhhln.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmaHBobGdyanlsa25va2JoaGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MDk4MTEsImV4cCI6MjA3ODE4NTgxMX0.4gE7ovFjcFSOk6pnAr7e1jWubDJK3gSiqVXhPYuohGI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);