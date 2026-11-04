import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

// Read Supabase credentials from Vite environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes("your-project") && 
  !supabaseUrl.includes("your-project-ref") &&
  !supabaseAnonKey.includes("your-") &&
  !supabaseAnonKey.includes("anon-key") &&
  supabaseUrl.startsWith("https://")
);

// Create Supabase client with graceful fallback
export const supabase = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl, supabaseAnonKey)
  : null;

if (!isSupabaseConfigured) {
  console.info(
    "[Supabase] Chưa cấu hình VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY trong .env. Hệ thống đang hoạt động với Mock Data cục bộ."
  );
}
