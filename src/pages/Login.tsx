import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiLock } from 'react-icons/fi';
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
    <div className="login-screen-container">
      {/* Top Banner with dynamic elements */}
      <div className="login-custom-hero">
        {/* Center Content: Skala Logo + Locked Badge + Tagline */}
        <div className="login-hero-center-content">
          <div className="login-skala-badge-anchor">
            <img 
              src="/beautyfair/portal-brand-branco.png" 
              alt="SKALA BRASIL" 
              className="login-hero-skala-logo" 
            />
            <img 
              src="/beautyfair/skala-badge.png" 
              alt="Líder em cuidados com cabelos - #1 do Brasil" 
              className="login-hero-badge-locked" 
            />
          </div>
          <h1 className="login-hero-tagline">
            Beleza Brasileira para todos.
          </h1>
        </div>
      </div>

      {/* Bottom White Section with Form & Beauty Fair Logo */}
      <div className="login-bottom-section">
        <div className={`login-form-wrapper ${shake ? 'shake' : ''}`}>
          <form className="login-main-form" onSubmit={handleLogin}>
            <div className={`login-field-box ${shake ? 'has-error' : ''}`}>
              <FiUser className="login-field-icon" />
              <input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className={`login-field-box ${shake ? 'has-error' : ''}`}>
              <FiLock className="login-field-icon" />
              <input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <div className="login-form-buttons">
              <button type="submit" className="login-pill-btn" disabled={loading}>
                {loading ? <div className="login-mini-spinner"></div> : 'ENTRAR'}
              </button>
              <a 
                href="#" 
                className="login-link-forgot" 
                onClick={(e) => { e.preventDefault(); handleForgotPassword(); }}
              >
                Esqueci minha senha
              </a>
            </div>
          </form>
        </div>

        {/* Beauty Fair Logo */}
        <div className="login-corner-logo">
          <img 
            src="/beautyfair/beautyfair-logo-preto.png" 
            alt="Beauty Fair International" 
          />
        </div>
      </div>
    </div>
  );
};

export default Login;
