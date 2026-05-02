import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { FiLock } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import './Login.css';

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return toast.error('As senhas não coincidem.');
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast.success('Senha atualizada com sucesso!');
      navigate('/login');
    } catch (err: any) {
      toast.error('Erro ao atualizar senha: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-header-section">
        <div className="orange-bar top"></div>
        <div className="login-header-content">
          <div className="login-header-left">
            <img src="/bora-brasil-branco.png" alt="Bora Brasil" className="login-logo-main" />
            <p className="login-event-tag">NOVA SENHA</p>
          </div>
        </div>
        <div className="orange-bar bottom"></div>
      </div>

      <div className="login-form-section">
        <div className="login-card-simple">
          <form className="login-form" onSubmit={handleResetPassword}>
            <p style={{ color: '#666', marginBottom: '1.5rem', textAlign: 'center' }}>
              Digite sua nova senha abaixo:
            </p>

            <div className="input-group">
              <div className="input-icon-wrapper">
                <FiLock />
              </div>
              <input
                type="password"
                placeholder="Nova Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <div className="input-icon-wrapper">
                <FiLock />
              </div>
              <input
                type="password"
                placeholder="Confirme a Nova Senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <div className="login-actions">
              <button type="submit" className="login-button-pill" disabled={loading}>
                {loading ? 'SALVANDO...' : 'ATUALIZAR SENHA'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
