import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: any | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Pegar sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id, session.user.email);
      else setLoading(false);
    });

    // Escutar mudanças na auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id, session.user.email);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string, email?: string) => {
    try {
      // 1. Tentar buscar por id_auth_user
      let { data } = await supabase
        .from('t_profiles')
        .select('*')
        .eq('id_auth_user', userId)
        .maybeSingle();

      // 2. Se não encontrar, tentar por e-mail
      if (!data && email) {
        const { data: byEmail } = await supabase
          .from('t_profiles')
          .select('*')
          .ilike('ds_email', email)
          .maybeSingle();

        if (byEmail) {
          data = byEmail;
          // Vincula o id_auth_user ao perfil para os próximos logins
          await supabase
            .from('t_profiles')
            .update({ id_auth_user: userId })
            .eq('id_profile', byEmail.id_profile);
        } else if (email.toLowerCase().includes('thomas') || email.toLowerCase().includes('fontes')) {
          // 3. Se for o usuário desenvolvedor/admin Thomas e não tiver perfil, tenta criar
          const newProfile = {
            id_auth_user: userId,
            nm_profile: 'Thomas Fontes (Admin)',
            ds_email: email,
            ds_role: 'ADMIN',
            nu_phone: '(11) 99999-9999'
          };
          const { data: created } = await supabase
            .from('t_profiles')
            .insert([newProfile])
            .select()
            .maybeSingle();

          data = created || { ...newProfile, id_profile: userId };
        }
      }

      // Fallback de segurança para administradores
      if (email && (email.toLowerCase().includes('thomas') || email.toLowerCase().includes('fontes'))) {
        if (data) {
          data.ds_role = 'ADMIN';
        } else {
          data = {
            id_profile: userId,
            id_auth_user: userId,
            nm_profile: 'Thomas Fontes (Admin)',
            ds_email: email,
            ds_role: 'ADMIN',
            nu_phone: ''
          };
        }
      }

      setProfile(data);
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      // Fallback se houver erro de rede/banco para Thomas
      if (email && (email.toLowerCase().includes('thomas') || email.toLowerCase().includes('fontes'))) {
        setProfile({
          id_profile: userId,
          id_auth_user: userId,
          nm_profile: 'Thomas Fontes (Admin)',
          ds_email: email,
          ds_role: 'ADMIN',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
