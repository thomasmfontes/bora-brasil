import { supabase } from './supabase';

// ──────────────────────────────────────────────────────────────────────────────
// Tipos
// ──────────────────────────────────────────────────────────────────────────────

export interface SendEmailPayload {
  /** Endereço do remetente */
  from: string;
  /** Destinatário(s) principal(is) */
  to: string | string[];
  /** Assunto do e-mail */
  subject: string;
  /** Corpo em texto puro */
  text?: string;
  /** Corpo em HTML */
  html?: string;
  /** Cópias (CC) */
  cc?: string | string[];
  /** Cópias ocultas (BCC) */
  bcc?: string | string[];
  /** Tags de rastreamento */
  'o:tag'?: string | string[];
  /** Modo de teste — e-mail NÃO é entregue, mas processado normalmente */
  'o:testmode'?: 'yes';
  /** Variáveis de template (JSON em string) */
  't:variables'?: string;
  /** Nome de template salvo no Mailgun */
  template?: string;
  /** Variáveis por destinatário para envio em lote (JSON em string) */
  'recipient-variables'?: string;
  /**
   * Conteúdo de um arquivo .ics codificado em base64.
   * Quando presente, a Edge Function o anexa ao e-mail como 'convite.ics'.
   */
  ics_base64?: string;
}

export interface SendEmailResult {
  id: string;
  message: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Função principal
// ──────────────────────────────────────────────────────────────────────────────

export async function sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
  const { data, error } = await supabase.functions.invoke<SendEmailResult>('send-email', {
    body: payload,
  });

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Resposta vazia da Edge Function send-email.');

  return data;
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers de e-mail — Agendamento de Sala
// ──────────────────────────────────────────────────────────────────────────────

const FROM_ADDRESS = 'Bora Brasil APAS 2026 <carteiro@borabrasileventos.com.br>';

const MONTH_NAMES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

const EVENT_LOCATION = 'Estande Skala Cosméticos, APAS 2026\nAv. 1201, Pavilhão Verde, Expo Center Norte - São Paulo';

// Localização no formato ICS (vírgulas escapadas com \)
const ICS_LOCATION = 'Estande Skala Cosméticos\\, APAS 2026\\, Av. 1201\\, Pavilhão Verde\\, Expo Center Norte - São Paulo';

interface BookingEmailParams {
  creatorName: string;
  creatorEmail: string;
  roomName: string;
  /** Data no formato 'YYYY-MM-DD' */
  date: string;
  /** Horário, ex.: '14:00' */
  time: string;
  participants: { name: string; email: string }[];
}

/** Formata 'YYYY-MM-DD' → '18 de maio de 2026' */
function formatDateLong(date: string): string {
  const [y, m, d] = date.split('-');
  return `${parseInt(d)} de ${MONTH_NAMES[parseInt(m) - 1]} de ${y}`;
}

/** Formata o intervalo de 1h: '12:00 às 13:00' */
function formatTimeRange(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const endTotal = h * 60 + (m || 0) + 60;
  const endH = Math.floor(endTotal / 60);
  const endM = endTotal % 60;
  return `${time} às ${endH}:${endM === 0 ? '00' : endM}`;
}

/** Monta lista de destinatários únicos (criador + participantes com e-mail válido) */
function collectRecipients(
  creatorName: string,
  creatorEmail: string,
  participants: { name: string; email: string }[]
): { name: string; email: string }[] {
  const seen = new Set<string>();
  const result: { name: string; email: string }[] = [];

  const add = (name: string, email: string) => {
    const normalized = email.trim().toLowerCase();
    if (normalized && normalized.includes('@') && !seen.has(normalized)) {
      seen.add(normalized);
      result.push({ name: name.trim(), email: normalized });
    }
  };

  add(creatorName, creatorEmail);
  for (const p of participants) {
    if (p.name.trim()) add(p.name, p.email);
  }

  return result;
}

/**
 * Converte uma string UTF-8 para base64 de forma segura
 * (suporta caracteres acentuados como ã, ç, etc.)
 */
function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  const binary = Array.from(bytes)
    .map((b) => String.fromCharCode(b))
    .join('');
  return btoa(binary);
}

/**
 * Formata um Date como string UTC para o formato iCalendar: 'YYYYMMDDTHHmmssZ'
 */
function formatICSDate(dt: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${dt.getUTCFullYear()}` +
    `${pad(dt.getUTCMonth() + 1)}` +
    `${pad(dt.getUTCDate())}` +
    `T${pad(dt.getUTCHours())}` +
    `${pad(dt.getUTCMinutes())}` +
    `${pad(dt.getUTCSeconds())}Z`
  );
}

/**
 * Gera o conteúdo de um arquivo .ics (iCalendar) para o agendamento.
 * - method 'REQUEST'  → confirmação (adiciona ao calendário)
 * - method 'CANCEL'   → cancelamento (remove do calendário)
 * O UID é derivado da sala + data + horário para garantir que o CANCEL
 * corresponda ao REQUEST original.
 */
function generateICS(params: {
  roomName: string;
  date: string;
  time: string;
  creatorName: string;
  attendeeName: string;
  attendeeEmail: string;
  method?: 'REQUEST' | 'CANCEL';
}): string {
  const { roomName, date, time, creatorName, attendeeName, attendeeEmail, method = 'REQUEST' } = params;

  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);

  // Converte horário local (UTC-3) para UTC
  const startUTC = new Date(Date.UTC(y, mo - 1, d, h + 3, mi || 0, 0));
  const endUTC = new Date(startUTC.getTime() + 60 * 60 * 1000); // +1 hora
  const now = new Date();

  const uid = `${roomName.replace(/\s+/g, '-').toLowerCase()}-${date}-${time.replace(':', '')}@borabrasileventos.com.br`;
  const isCancel = method === 'CANCEL';

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Bora Brasil//APAS 2026//PT',
    'CALSCALE:GREGORIAN',
    `METHOD:${method}`,
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatICSDate(now)}`,
    `DTSTART:${formatICSDate(startUTC)}`,
    `DTEND:${formatICSDate(endUTC)}`,
    `SUMMARY:${isCancel ? '[CANCELADO] ' : ''}Reunião – ${roomName} | APAS 2026`,
    `DESCRIPTION:${isCancel
      ? `Reunião cancelada. Agendada originalmente por ${creatorName}.`
      : `Reunião agendada por ${creatorName} via portal Bora Brasil APAS 2026.`}`,
    `LOCATION:${ICS_LOCATION}`,
    `ORGANIZER;CN=Bora Brasil APAS 2026:mailto:${FROM_ADDRESS.match(/<(.+)>/)![1]}`,
    `ATTENDEE;CN=${attendeeName};RSVP=${isCancel ? 'FALSE' : 'TRUE'};PARTSTAT=${isCancel ? 'DECLINED' : 'NEEDS-ACTION'}:mailto:${attendeeEmail}`,
    `STATUS:${isCancel ? 'CANCELLED' : 'CONFIRMED'}`,
    `SEQUENCE:${isCancel ? 1 : 0}`,
    // Lembrete apenas na confirmação
    ...(!isCancel ? [
      'BEGIN:VALARM',
      'TRIGGER:-PT30M',
      'ACTION:DISPLAY',
      'DESCRIPTION:Lembrete: reunião em 30 minutos',
      'END:VALARM',
    ] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.join('\r\n');
}

/**
 * Envia e-mail de **confirmação** com arquivo .ics anexado.
 * Cada destinatário recebe um e-mail individual personalizado com seu convite de calendário.
 */
export async function sendBookingConfirmationEmail(params: BookingEmailParams): Promise<void> {
  const { creatorName, creatorEmail, roomName, date, time, participants } = params;

  const recipients = collectRecipients(creatorName, creatorEmail, participants);
  if (recipients.length === 0) return;

  const formattedDate = formatDateLong(date);
  const timeRange = formatTimeRange(time);

  await Promise.all(
    recipients.map(({ name, email }) => {
      const text = [
        `Olá ${name},`,
        ``,
        `Você recebeu um convite do ${creatorName} para uma reunião na Sala ${roomName} no estande da APAS 2026:`,
        ``,
        `Data: ${formattedDate}`,
        `Hora: ${timeRange}`,
        `Local: ${EVENT_LOCATION}`,
        ``,
        `Aguardamos sua presença`,
      ].join('\n');

      const icsContent = generateICS({
        roomName,
        date,
        time,
        creatorName,
        attendeeName: name,
        attendeeEmail: email,
      });

      return sendEmail({
        from: FROM_ADDRESS,
        to: email,
        subject: '✅ Confirmação de Reserva',
        text,
        ics_base64: toBase64(icsContent),
      });
    })
  );
}

/**
 * Envia e-mail de **cancelamento** de agendamento com .ics METHOD:CANCEL.
 * Clientes de calendário (Outlook, Gmail, Apple) removem o evento automaticamente.
 */
export async function sendBookingCancellationEmail(params: BookingEmailParams): Promise<void> {
  const { creatorName, creatorEmail, roomName, date, time, participants } = params;

  const recipients = collectRecipients(creatorName, creatorEmail, participants);
  if (recipients.length === 0) return;

  const formattedDate = formatDateLong(date);
  const timeRange = formatTimeRange(time);

  await Promise.all(
    recipients.map(({ name, email }) => {
      const text = [
        `Olá ${name},`,
        ``,
        `Informamos que a reserva abaixo foi CANCELADA:`,
        ``,
        `Sala: ${roomName}`,
        `Data: ${formattedDate}`,
        `Hora: ${timeRange}`,
        `Solicitante: ${creatorName}`,
        ``,
        `Bora Brasil – APAS 2026`,
      ].join('\n');

      const icsContent = generateICS({
        roomName,
        date,
        time,
        creatorName,
        attendeeName: name,
        attendeeEmail: email,
        method: 'CANCEL',
      });

      return sendEmail({
        from: FROM_ADDRESS,
        to: email,
        subject: '❌ Cancelamento de Reserva',
        text,
        ics_base64: toBase64(icsContent),
      });
    })
  );
}
