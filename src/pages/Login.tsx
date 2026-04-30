import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { FiMail, FiLock } from 'react-icons/fi';
import './Login.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <header className="login-header">
        <div className="login-logos">
          {/* Aqui usaremos placeholders ou ícones temporários até termos os assets reais */}
          <h1 style={{ color: 'white', fontSize: '3rem', fontFamily: 'var(--font-besley)' }}>Bora</h1>
          <div className="login-logo-divider"></div>
          <div style={{ color: 'white', textAlign: 'left' }}>
            <p style={{ fontWeight: 'bold' }}>SKALA</p>
            <p style={{ fontSize: '0.8rem' }}>BRASIL</p>
          </div>
        </div>
        <p className="login-event-tag">APAS 2026!</p>
      </header>

      <div className="login-card">
        <form className="login-form" onSubmit={handleLogin}>
          <div className="input-group">
            <FiMail className="input-icon" />
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <FiLock className="input-icon" />
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p style={{ color: 'red', fontSize: '0.8rem', textAlign: 'center' }}>{error}</p>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="login-footer-links">
          <a href="#">Esqueci minha senha</a>
        </div>
      </div>
    </div>
  );
};

export default Login;
