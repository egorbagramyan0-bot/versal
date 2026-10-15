/*
 * Пример приёма заявок: Cloudflare Worker → Telegram-бот администратора.
 * Это один из вариантов; подойдёт и любой другой обработчик, который принимает POST с JSON
 * и отвечает 2xx только после того, как заявка действительно доставлена.
 *
 * Настройка:
 *   1. Создать бота через @BotFather, получить токен.
 *   2. Узнать chat_id администратора (или группы, куда добавлен бот).
 *   3. Развернуть этот Worker, задать секреты TELEGRAM_TOKEN и TELEGRAM_CHAT_ID,
 *      переменную ALLOWED_ORIGIN = адрес сайта (например, https://versal-chaltyr.ru).
 *   4. В assets/config.js указать lead.endpoint = адрес Worker'а.
 */
export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept'
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });
    if (request.headers.get('Origin') !== env.ALLOWED_ORIGIN) return new Response('Forbidden', { status: 403, headers: cors });

    let lead;
    try { lead = await request.json(); } catch { return new Response('Bad JSON', { status: 400, headers: cors }); }

    const name = String(lead.name || '').trim().slice(0, 100);
    const phone = String(lead.phone || '').trim().slice(0, 40);
    if (name.length < 2 || phone.replace(/\D/g, '').length < 10 || lead.consent !== true) {
      return new Response('Invalid lead', { status: 422, headers: cors });
    }

    const text = String(lead.text || '').slice(0, 3500);
    const tg = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text })
    });

    // Сайт покажет «Заявка отправлена» только при успешной доставке.
    if (!tg.ok) return new Response('Delivery failed', { status: 502, headers: cors });
    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  }
};
