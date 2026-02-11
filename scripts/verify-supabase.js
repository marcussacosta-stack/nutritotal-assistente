
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Force node-fetch if needed (Node 18+ has fetch)
// But to be safe, let's just use what we have.

console.log('--- Supabase Connection Tester ---');

try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const envPath = path.resolve(__dirname, '../.env.local');

    if (!fs.existsSync(envPath)) {
        console.error('Environment file not found!');
        process.exit(1);
    }

    const envContent = fs.readFileSync(envPath, 'utf-8');
    const env = {};
    envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            env[key.trim()] = value.trim();
        }
    });

    const supabaseUrl = env.VITE_SUPABASE_URL;
    const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

    console.log(`URL: ${supabaseUrl}`);
    console.log(`Key: ${supabaseKey ? supabaseKey.substring(0, 10) + '...' : 'MISSING'}`);

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing Supabase credentials in .env.local');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Test simple health check or query
    console.log('Attempting to fetch data...');

    // Use a public table if possible, or just check 'auth' health
    const { data, error } = await supabase.from('user_state').select('count', { count: 'exact', head: true });

    if (error) {
        console.error('Query Error:', error);
        if (error.code) console.error('Error Code:', error.code);
        if (error.message) console.error('Error Message:', error.message);
        if (error.details) console.error('Error Details:', error.details);
        if (error.hint) console.error('Error Hint:', error.hint);
    } else {
        console.log('Connection Successful! (Data fetched or empty result)');
    }

} catch (err) {
    console.error('Script Crash:', err);
}
