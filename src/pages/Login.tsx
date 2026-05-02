import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { FiMail, FiLock } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import './Login.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      toast.success('Bem-vindo de volta!', {
        style: {
          background: '#fff',
          color: '#333',
          borderRadius: '10px',
          fontWeight: 'bold',
        },
      });
      navigate('/');
    } catch (err: any) {
      setShake(true);
      setTimeout(() => setShake(false), 500);

      const message = err.message === 'Invalid login credentials' 
        ? 'E-mail ou senha incorretos.' 
        : 'Ocorreu um erro ao entrar. Tente novamente.';
        
      toast.error(message, {
        style: {
          background: '#fff',
          color: '#333',
          borderRadius: '10px',
          fontWeight: 'bold',
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      return toast.error('Por favor, digite seu e-mail primeiro.');
    }

    const toastId = toast.loading('Verificando e-mail...');
    try {
      // Verifica se o perfil existe no banco antes de tentar o reset
      const { data: profileExists } = await supabase
        .from('t_profiles')
        .select('ds_email')
        .eq('ds_email', email)
        .maybeSingle();

      if (!profileExists) {
        return toast.error('Este e-mail não está cadastrado no sistema.', { id: toastId });
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success('E-mail enviado! Verifique sua caixa de entrada.', { id: toastId });
    } catch (err: any) {
      toast.error('Erro: ' + err.message, { id: toastId });
    }
  };

  return (
    <div className="login-container">
      <div className="login-header-section">
        <div className="orange-bar top"></div>
        
        <div className="login-header-content">
          <div className="login-header-left">
            <img src="/bora-brasil-branco.png" alt="Bora Brasil" className="login-logo-main" />
            <p className="login-event-tag">APAS 2026!</p>
          </div>
          
          <div className="login-header-divider"></div>
          
          <div className="login-header-right">
            <img src="/skala-lola.png" alt="Skala & Lola" className="login-logo-secondary" />
          </div>
        </div>
        
        <div className="orange-bar bottom"></div>
      </div>

      <div className="login-form-section">
        <div className={`login-card-simple ${shake ? 'shake' : ''}`}>
          <form className="login-form" onSubmit={handleLogin}>
            <div className={`input-group ${shake ? 'input-error' : ''}`}>
              <div className="input-icon-wrapper">
                <FiMail />
              </div>
              <input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className={`input-group ${shake ? 'input-error' : ''}`}>
              <div className="input-icon-wrapper">
                <FiLock />
              </div>
              <input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="login-actions">
              <button type="submit" className="login-button-pill" disabled={loading}>
                {loading ? <div className="login-spinner"></div> : 'ENTRAR'}
              </button>
               <a 
                href="#" 
                className="forgot-password-link" 
                onClick={(e) => { e.preventDefault(); handleForgotPassword(); }}
              >
                Esqueci minha senha
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
