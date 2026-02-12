import React, { useEffect, useState } from 'react';

const DebugView: React.FC = () => {
    const [envVars, setEnvVars] = useState<any>({});

    useEffect(() => {
        const url = import.meta.env.VITE_SUPABASE_URL;
        const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const gemini = import.meta.env.GEMINI_API_KEY;

        setEnvVars({
            VITE_SUPABASE_URL: url ? url : '(Missing)',
            VITE_SUPABASE_ANON_KEY: key ? `${key.substring(0, 5)}...${key.substring(key.length - 5)}` : '(Missing)',
            GEMINI_API_KEY: gemini ? '(Present)' : '(Missing)',
            MODE: import.meta.env.MODE,
            BASE_URL: import.meta.env.BASE_URL
        });
    }, []);

    return (
        <div className="p-8 bg-gray-100 min-h-screen text-xs font-mono break-all">
            <h1 className="text-xl font-bold mb-4">Debug Environment</h1>
            <pre className="bg-white p-4 rounded shadow">
                {JSON.stringify(envVars, null, 2)}
            </pre>
            <div className="mt-4">
                <p><strong>Diagnosis:</strong></p>
                <ul className="list-disc pl-5 mt-2 space-y-2">
                    {envVars.VITE_SUPABASE_URL === '(Missing)' && <li className="text-red-600">URL do Supabase não encontrada.</li>}
                    {envVars.VITE_SUPABASE_ANON_KEY === '(Missing)' && <li className="text-red-600">Chave do Supabase não encontrada.</li>}
                    {envVars.VITE_SUPABASE_ANON_KEY?.startsWith('sb_') && <li className="text-red-600">Chave parece estar no formato incorreto (sb_...). Deveria começar com eyJ...</li>}
                    <li>Se a chave começa com eyJ... e o erro persiste, verifique espaços em branco no Vercel.</li>
                </ul>
            </div>
            <button
                onClick={() => window.location.hash = ''}
                className="mt-8 px-4 py-2 bg-blue-600 text-white rounded"
            >
                Voltar
            </button>
        </div>
    );
};

export default DebugView;
