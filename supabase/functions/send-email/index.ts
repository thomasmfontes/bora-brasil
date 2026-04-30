// @ts-nocheck — Este arquivo é executado no runtime Deno (Edge Function Supabase)
// Os erros do VS Code são falsos positivos do TypeScript/Node.js

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const MAILGUN_API_KEY = Deno.env.get('MAILGUN_API_KEY');
    const MAILGUN_DOMAIN = Deno.env.get('MAILGUN_DOMAIN');

    if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
      throw new Error('Segredos MAILGUN_API_KEY e MAILGUN_DOMAIN não configurados.');
    }

    const body = await req.json();

    const {
      to,
      from,
      subject,
      text,
      html,
      cc,
      bcc,
      'o:tag': tag,
      'o:testmode': testmode,
      't:variables': tVariables,
      template,
      'recipient-variables': recipientVariables,
      // Arquivo ICS codificado em base64 (opcional)
      ics_base64,
    } = body;

    // Valida campos obrigatórios
    if (!to || !from || !subject) {
      throw new Error("Os campos 'to', 'from' e 'subject' são obrigatórios.");
    }
    if (!text && !html && !template) {
      throw new Error("Ao menos um dos campos 'text', 'html' ou 'template' é obrigatório.");
    }

    // Monta o form-data para o Mailgun
    const formData = new FormData();
    formData.append('from', from);
    formData.append('subject', subject);

    const toList = Array.isArray(to) ? to : [to];
    toList.forEach((addr: string) => formData.append('to', addr));

    if (text) formData.append('text', text);
    if (html) formData.append('html', html);
    if (template) formData.append('template', template);

    if (cc) {
      const ccList = Array.isArray(cc) ? cc : [cc];
      ccList.forEach((addr: string) => formData.append('cc', addr));
    }
    if (bcc) {
      const bccList = Array.isArray(bcc) ? bcc : [bcc];
      bccList.forEach((addr: string) => formData.append('bcc', addr));
    }
    if (tag) {
      const tagList = Array.isArray(tag) ? tag : [tag];
      tagList.forEach((t: string) => formData.append('o:tag', t));
    }
    if (testmode) formData.append('o:testmode', testmode);
    if (tVariables) formData.append('t:variables', tVariables);
    if (recipientVariables) formData.append('recipient-variables', recipientVariables);

    // Anexa o arquivo .ics se fornecido (decodifica base64 → Blob)
    if (ics_base64) {
      const icsBytes = Uint8Array.from(atob(ics_base64), (c) => c.charCodeAt(0));
      const icsBlob = new Blob([icsBytes], {
        type: 'text/calendar; charset=utf-8; method=REQUEST',
      });
      formData.append('attachment', icsBlob, 'convite.ics');
    }

    // Chama a API do Mailgun (região EUA)
    const credentials = btoa(`api:${MAILGUN_API_KEY}`);
    const mailgunRes = await fetch(
      `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`,
      {
        method: 'POST',
        headers: { Authorization: `Basic ${credentials}` },
        body: formData,
      }
    );

    const result = await mailgunRes.json();

    if (!mailgunRes.ok) {
      throw new Error(result.message || `Erro Mailgun: ${mailgunRes.status}`);
    }

    return new Response(JSON.stringify(result), {
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
