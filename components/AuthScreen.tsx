import React, { useState } from 'react';
import { UserAccount } from '../types';
import { loginUser, registerUser } from '../services/storageService';
import { Lock, Mail, ArrowRight, Activity, Loader2, CheckCircle } from 'lucide-react';

interface Props {
  onLogin: (user: UserAccount) => void;
}

const AuthScreen: React.FC<Props> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !password) {
      setError("Preencha todos os campos.");
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    if (!isLogin && password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const result = await loginUser(email, password);
        if (result.success && result.user) {
          onLogin(result.user);
        } else {
          setError(result.message || "Erro ao entrar. Verifique suas credenciais.");
        }
      } else {
        const result = await registerUser(email, password);
        if (result.success) {
          setSuccess("Conta criada com sucesso! Verifique seu email para confirmar ou faça login.");
          if (result.user) {
             // Tenta logar automaticamente se a sessão foi criada
             onLogin(result.user);
          } else {
             // Caso necessite confirmação de email, muda para tela de login após um tempo
             setTimeout(() => setIsLogin(true), 3000);
          }
        } else {
          setError(result.message || "Erro ao criar conta.");
        }
      }
    } catch (e) {
      setError("Ocorreu um erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 bg-gradient-to-br from-green-50 to-blue-50">
      <div className="w-full max-w-sm bg-white p-8 rounded-3xl shadow-xl animate-scale-in">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-brand-600 rotate-3 shadow-sm">
            <Activity size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isLogin ? 'Bem-vindo(a)!' : 'Crie sua conta'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {isLogin ? 'Acesse seu plano alimentar.' : 'Comece sua jornada saudável hoje.'}
          </p>
        </div>

        <div className="flex bg-gray-100 p-1.5 rounded-xl mb-6">
          <button
            onClick={() => { setIsLogin(true); setError(''); setSuccess(''); }}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isLogin ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Entrar
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(''); setSuccess(''); }}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isLogin ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Cadastrar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                placeholder="seu@email.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>
          </div>

          {!isLogin && (
            <div className="animate-fade-in">
              <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">Confirmar Senha</label>
              <div className="relative">
                <CheckCircle className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all ${
                    confirmPassword && password !== confirmPassword ? 'border-red-300 focus:border-red-300 focus:ring-red-200' : 'border-gray-200'
                  }`}
                  placeholder="Repita sua senha"
                  required
                />
              </div>
            </div>
          )}

          {error && <div className="text-red-500 text-sm text-center font-medium bg-red-50 p-3 rounded-xl border border-red-100 animate-shake">{error}</div>}
          {success && <div className="text-green-600 text-sm text-center font-medium bg-green-50 p-3 rounded-xl border border-green-100 animate-fade-in">{success}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-brand-600 text-white rounded-xl font-bold shadow-lg hover:bg-brand-700 active:scale-95 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="animate-spin" /> : (isLogin ? 'Acessar App' : 'Criar Conta Grátis')}
            {!loading && <ArrowRight size={20} />}
          </button>
        </form>
      </div>
      <p className="mt-8 text-xs text-gray-400 text-center max-w-[250px] mx-auto leading-relaxed">
        {isLogin 
          ? "Esqueceu sua senha? Entre em contato com o suporte." 
          : "Ao se cadastrar, seus dados de saúde serão armazenados de forma segura e privada."}
      </p>
    </div>
  );
};

export default AuthScreen;