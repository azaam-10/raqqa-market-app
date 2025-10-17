
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oxysdlwfjcxypytlkcko.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94eXNkbHdmamN4eXB5dGxrY2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MTIzMTYsImV4cCI6MjA3NDQ4ODMxNn0.To2Rcc_Q4DpBg737Zst-cvXgvWCYOBNxL0hLpCwP7PI';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL or Anon Key is missing.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
