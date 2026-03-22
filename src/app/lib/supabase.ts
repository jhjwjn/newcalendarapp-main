import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://ngmvbhpwhljyvivelbbx.supabase.co';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nbXZiaHB3aGxqeXZpdmVsYmJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3OTMxOTMsImV4cCI6MjA4OTM2OTE5M30.9ppcaVbtXP7qtnua6Q0BBuAP73UldiOH5otqtFZS52M';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isConfigured = !!(supabaseUrl && supabaseAnonKey);
