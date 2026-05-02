// @ts-nocheck — Este arquivo é executado no runtime Deno (Edge Function Supabase)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    // Valida que o chamador é um ADMIN autenticado
    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error('Não autorizado.');

    const { data: callerProfile } = await callerClient
      .from('t_profiles')
      .select('ds_role')
      .eq('id_auth_user', caller.id)
      .single();

    if (callerProfile?.ds_role !== 'ADMIN') {
      throw new Error('Apenas administradores podem atualizar usuários.');
    }

    // Usa a Service Role Key para atualizar o usuário
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { id_profile, nm_profile, email, password, ds_role, nu_phone } = await req.json();

    // 1. Encontrar o id_auth_user a partir do id_profile
    const { data: profileToUpdate, error: profileErr } = await adminClient
      .from('t_profiles')
      .select('id_auth_user')
      .eq('id_profile', id_profile)
      .single();

    if (profileErr) throw new Error('Perfil não encontrado.');
    const authUserId = profileToUpdate.id_auth_user;

    // 2. Atualizar Auth (Email e Senha)
    const updateData: any = {
      email,
      user_metadata: { full_name: nm_profile },
    };
    if (password && password.trim() !== '') {
      updateData.password = password;
    }

    const { error: authErr } = await adminClient.auth.admin.updateUserById(
      authUserId,
      updateData
    );

    if (authErr) throw authErr;

    // 3. Atualizar Perfil (Nome, Email, Role, Telefone)
    const { error: profileUpdateErr } = await adminClient
      .from('t_profiles')
      .update({ 
        nm_profile, 
        ds_email: email,
        ds_role,
        nu_phone
      })
      .eq('id_profile', id_profile);

    if (profileUpdateErr) throw profileUpdateErr;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
