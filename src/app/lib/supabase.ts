import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://xbbmsozzpyhteiwqhjxj.supabase.co';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiYm1zb3p6cHlodGVpd3FoanhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MjA3NjcsImV4cCI6MjA5MTI5Njc2N30.XIY0T1YMUIVGBcdQ2cm-T8BpoiLKGtGd9H7qOKAwuw8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isConfigured = !!(supabaseUrl && supabaseAnonKey);
