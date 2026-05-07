import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Configurações do Supabase (Vercel pega das variáveis de ambiente)
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Busca os dados com join
    const { data: bookings, error } = await supabase
      .from('t_bookings')
      .select(`
        dt_booking,
        hr_time_slot,
        t_rooms (nm_room),
        t_booking_participants (nm_client, nm_participant, ds_email, nu_phone)
      `)
      .order('dt_booking', { ascending: true });

    if (error) throw error;

    // Achata os dados para o formato de tabela
    const rows = [];
    bookings.forEach(b => {
      const participants = b.t_booking_participants || [];
      if (participants.length === 0) {
        rows.push({
          Data: b.dt_booking,
          Horario: b.hr_time_slot,
          Sala: b.t_rooms?.nm_room || '—',
          Cliente: '—',
          Participante: '—',
          Email: '—',
          Telefone: '—'
        });
      } else {
        participants.forEach(p => {
          rows.push({
            Data: b.dt_booking,
            Horario: b.hr_time_slot,
            Sala: b.t_rooms?.nm_room || '—',
            Cliente: p.nm_client || '—',
            Participante: p.nm_participant || '—',
            Email: p.ds_email || '—',
            Telefone: p.nu_phone || '—'
          });
        });
      }
    });

    // Converte para CSV
    if (rows.length === 0) {
      return res.status(200).send("Sem dados");
    }

    const headers = Object.keys(rows[0]);
    const csvContent = [
      headers.join(';'),
      ...rows.map(row => headers.map(h => `"${row[h] || ''}"`).join(';'))
    ].join('\n');

    // Retorna como CSV com BOM para o Excel
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=agendamentos.csv');
    res.status(200).send('\ufeff' + csvContent);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
