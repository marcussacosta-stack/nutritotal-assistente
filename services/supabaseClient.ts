
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase Config:', {
    url: SUPABASE_URL ? 'Loaded' : 'Missing',
    key: SUPABASE_ANON_KEY ? 'Loaded' : 'Missing'
});

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('CRITICAL: Supabase URL or Key is missing from environment variables!');
    // Prevent crash by providing dummy values if missing, but log error
    // This allows the app to render error UI instead of white screen if possible
}

export const supabase = createClient(
    SUPABASE_URL || 'https://placeholder.supabase.co',
    SUPABASE_ANON_KEY || 'placeholder'
);
