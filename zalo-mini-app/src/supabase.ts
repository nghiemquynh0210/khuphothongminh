import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || "https://wjdgaobhipkgzveidtra.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqZGdhb2JoaXBrZ3p2ZWlkdHJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4NTk0MzQsImV4cCI6MjEwNzQzNTQzNH0.7fw6blUWmBm9lJ-tfazcGEsr20KOT6Qn1ytSZk_CMtU";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
