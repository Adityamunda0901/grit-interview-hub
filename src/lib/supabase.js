import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && key ? createClient(url, key) : null;
// The current UI data operations use localStorage in all cases. Supabase is scaffolded, not yet wired.
export const backendMode = "demo-local";
