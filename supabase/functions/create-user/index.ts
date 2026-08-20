// @ts-nocheck — Este arquivo é executado no runtime Deno (Edge Function Supabase)
// Os erros do VS Code são falsos positivos do TypeScript/Node.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error('Não autorizado.');

    let { data: callerProfile } = await adminClient
      .from('t_profiles')
      .select('ds_role')
      .eq('id_auth_user', caller.id)
      .maybeSingle();

    const isMasterAdmin = caller.email?.toLowerCase().includes('thomas') || caller.email?.toLowerCase().includes('fontes');

    if (!callerProfile && isMasterAdmin) {
      const { data: createdProfile } = await adminClient
        .from('t_profiles')
        .insert({
          id_auth_user: caller.id,
          nm_profile: 'Thomas Fontes (Admin)',
          ds_role: 'ADMIN',
          ds_email: caller.email,
          nu_phone: '(11) 99999-9999'
        })
        .select()
        .single();
      callerProfile = createdProfile;
    }

    if (!isMasterAdmin && callerProfile?.ds_role !== 'ADMIN') {
      throw new Error('Apenas administradores podem criar usuários.');
    }

    const { nm_profile, email, password, ds_role, nu_phone, room_access } = await req.json();

    const { data: authData, error: signUpErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: nm_profile },
    });

    if (signUpErr) throw signUpErr;

    if (authData.user) {
      const { data: profileData, error: profileErr } = await adminClient
        .from('t_profiles')
        .upsert({ 
          id_auth_user: authData.user.id,
          ds_role, 
          nm_profile, 
          ds_email: email, 
          nu_phone 
        }, { onConflict: 'id_auth_user' })
        .select('id_profile')
        .single();
      
      if (profileErr) throw profileErr;

      // Se houver acessos selecionados, insere-os
      if (room_access && Array.isArray(room_access) && room_access.length > 0) {
        const accessRecords = room_access.map(id_room => ({
          id_profile: profileData.id_profile,
          id_room
        }));
        
        const { error: accessErr } = await adminClient
          .from('t_user_room_access')
          .insert(accessRecords);
          
        if (accessErr) throw accessErr;
      }
    }

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
