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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Sem cabeçalho de autorização.');

    // Usa a Service Role Key para todas as operações internas para garantir sucesso
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 0. Valida que o chamador é um ADMIN (Usamos o JWT dele mas consultamos via AdminClient)
    const { data: { user: caller }, error: authUserErr } = await adminClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authUserErr || !caller) throw new Error('Token inválido ou não autorizado.');

    const { data: callerProfile, error: callerProfileErr } = await adminClient
      .from('t_profiles')
      .select('ds_role')
      .eq('id_auth_user', caller.id)
      .single();

    if (callerProfileErr || callerProfile?.ds_role !== 'ADMIN') {
      console.error('Falha na validação de Admin:', callerProfileErr || 'Role não é ADMIN');
      throw new Error('Apenas administradores podem atualizar usuários.');
    }

    const { id_profile, nm_profile, email, password, ds_role, nu_phone } = await req.json();
    console.log(`Iniciando atualização do perfil ${id_profile} para o e-mail ${email}`);

    // 1. Encontrar o id_auth_user a partir do id_profile
    const { data: profileToUpdate, error: profileToUpdateErr } = await adminClient
      .from('t_profiles')
      .select('id_auth_user')
      .eq('id_profile', id_profile)
      .single();

    if (profileToUpdateErr) throw new Error('Perfil não encontrado.');
    const authUserId = profileToUpdate.id_auth_user;
    console.log(`ID de Autenticação vinculado ao perfil: ${authUserId}`);

    // 2. Atualizar Auth (Email e Senha)
    const updateData: any = {
      user_metadata: { nm_profile: nm_profile },
    };

    const { data: userAuth, error: getUserErr } = await adminClient.auth.admin.getUserById(authUserId);
    if (getUserErr) {
      console.error('Erro ao buscar usuário no Auth:', getUserErr.message);
      throw new Error(`Usuário não encontrado no Authentication: ${getUserErr.message}`);
    }

    console.log(`E-mail atual no Auth: ${userAuth?.user?.email}`);

    if (email && email.toLowerCase() !== userAuth?.user?.email?.toLowerCase()) {
      console.log(`Alterando e-mail de ${userAuth?.user?.email} para ${email}`);
      updateData.email = email;
      updateData.email_confirm = true;
    }

    if (password && password.trim() !== '') {
      updateData.password = password;
    }

    console.log('Enviando payload para admin.updateUserById:', JSON.stringify(updateData));

    // 2.5 Verificação manual de duplicidade para evitar erro 500 do Supabase
    if (updateData.email) {
      const { data: usersList } = await adminClient.auth.admin.listUsers();
      const duplicate = usersList?.users.find(u => 
        u.email?.toLowerCase() === updateData.email.toLowerCase() && u.id !== authUserId
      );
      if (duplicate) {
        console.error('E-mail duplicado detectado:', duplicate.id);
        throw new Error(`O e-mail ${updateData.email} já está em uso por outro usuário.`);
      }
    }

    const { data: updatedAuth, error: authErr } = await adminClient.auth.admin.updateUserById(
      authUserId,
      updateData
    );

    if (authErr) {
      console.error('Erro detalhado do Auth Admin:', JSON.stringify(authErr));
      throw new Error(`Erro no Authentication: ${authErr.message} (Code: ${authErr.code})`);
    }

    console.log('Auth atualizado com sucesso.');

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
