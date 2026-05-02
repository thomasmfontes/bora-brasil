/**
 * Utilitário para envio de notificações via WhatsApp (Evolution API)
 */

const EVOLUTION_API_URL = 'https://thorough-guitars-futures-athletes.trycloudflare.com';

/**
 * Normaliza o número de telefone para o formato E.164 (apenas números)
 * Ex: (11) 91234-5678 -> 5511912345678
 */
export const normalizePhoneNumber = (phone: string): string => {
  if (!phone) return '';
  // Remove tudo que não for número
  let cleaned = phone.replace(/\D/g, '');
  
  // Se não começar com 55 (Brasil) e tiver 10 ou 11 dígitos, adiciona o 55
  if (cleaned.length >= 10 && cleaned.length <= 11 && !cleaned.startsWith('55')) {
    cleaned = '55' + cleaned;
  }
  
  return cleaned;
};

interface SendMessageParams {
  phone: string;
  message: string;
}

/**
 * Envia uma mensagem usando o Robô de Automação Humana
 */
export const sendWhatsAppMessage = async ({ phone, message }: SendMessageParams) => {
  const cleanPhone = normalizePhoneNumber(phone);
  
  if (!cleanPhone || cleanPhone.length < 10) {
    console.warn('[WhatsApp] Número inválido ignorado:', phone);
    return;
  }

  console.log('[WhatsApp] Iniciando processo de envio para:', cleanPhone);

  try {
    const url = `${EVOLUTION_API_URL}/send`;
    console.log('[WhatsApp] Chamando URL:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        number: cleanPhone,
        message: message
      })
    });

    console.log('[WhatsApp] Resposta do servidor:', response.status);

    if (!response.ok) {
      throw new Error('Erro ao enviar via Robô Humano');
    }

    console.log('[WhatsApp] Mensagem enviada pelo robô para:', cleanPhone);
    return await response.json();
  } catch (error) {
    console.error('[WhatsApp] Erro no disparo:', error);
  }
};

/**
 * Helper para Confirmação de Agendamento
 */
const MONTH_NAMES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

const EVENT_LOCATION = 'Estande Bora Brasil | Skala Brasil e Lola From Rio\nAv. 1201, Pavilhão Verde, Expo Center Norte - São Paulo';

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

/**
 * Helper para Confirmação de Agendamento
 */
export const sendBookingConfirmationWhatsApp = async (params: {
  toName: string;
  phone: string;
  roomName: string;
  date: string;
  time: string;
  creatorName: string;
  creatorPhone?: string;
}) => {
  const formattedDate = formatDateLong(params.date);
  const timeRange = formatTimeRange(params.time);

  const message = [
    `Olá ${params.toName},`,
    ``,
    `Você recebeu um convite de ${params.creatorName} para uma reunião no estande da Bora Brasil | Skala Brasil e Lola From Rio:`,
    ``,
    `Data: ${formattedDate}`,
    `Hora: ${timeRange}`,
    `Local: ${EVENT_LOCATION}`,
    ``,
    `Aguardamos sua presença`,
    ``,
    params.creatorPhone ? `Caso precise falar direto com o organizador, entre em contato: ${params.creatorPhone}` : `Este é um disparo automático.`
  ].join('\n');
  
  return sendWhatsAppMessage({ phone: params.phone, message });
};

/**
 * Helper para Cancelamento de Agendamento
 */
export const sendBookingCancellationWhatsApp = async (params: {
  toName: string;
  phone: string;
  roomName: string;
  date: string;
  time: string;
  canceledBy: string;
}) => {
  const formattedDate = formatDateLong(params.date);
  const timeRange = formatTimeRange(params.time);

  const message = [
    `Olá ${params.toName},`,
    ``,
    `Informamos que a reserva abaixo foi CANCELADA:`,
    ``,
    `Sala: ${params.roomName}`,
    `Data: ${formattedDate}`,
    `Hora: ${timeRange}`,
    `Solicitante: ${params.canceledBy}`,
    ``,
    `Bora Brasil – APAS 2026`
  ].join('\n');
  
  return sendWhatsAppMessage({ phone: params.phone, message });
};
