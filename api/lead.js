/*
 * Приём заявок с сайта «Версаль» — серверная функция Vercel.
 * Пересылает заявку администратору в Telegram.
 *
 * Нужны переменные окружения в настройках проекта Vercel (Settings → Environment Variables):
 *   TELEGRAM_BOT_TOKEN — токен бота от @BotFather
 *   TELEGRAM_CHAT_ID   — id чата администратора (или группы, куда добавлен бот)
 * Пока их нет, функция отвечает 503 { notConfigured: true }, и сайт честно сообщает,
 * что онлайн-заявки не подключены, предлагая позвонить.
 */
const OCCASIONS = {
  wedding: 'Свадьба', matchmaking: 'Сватовство', birthday: 'Юбилей или день рождения',
  family: 'Семейное торжество', corporate: 'Корпоратив', memorial: 'Поминки', other: 'Другое'
};
const GOALS = { date: 'условия на дату', menu: 'меню и расчёт', visit: 'просмотр зала' };
const CONTACT = { call: 'звонок', whatsapp: 'WhatsApp', telegram: 'Telegram' };

const str = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b-\u001f]/g, '').trim().slice(0, max);

function formatDate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [y, m, d] = iso.split('-').map(Number);
  try {
    return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long', timeZone: 'UTC' })
      .format(new Date(Date.UTC(y, m - 1, d)));
  } catch (e) { return iso; }
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return res.status(503).json({ ok: false, notConfigured: true });

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } }
  if (!b || typeof b !== 'object') return res.status(400).json({ ok: false });

  // ловушка для ботов: поле website в форме скрыто
  if (str(b.website, 200)) return res.status(200).json({ ok: true });

  const name = str(b.name, 100);
  const phone = str(b.phone, 40);
  const digits = phone.replace(/\D/g, '');
  if (name.length < 2 || digits.length < 10 || digits.length > 15 || b.consent !== true) {
    return res.status(422).json({ ok: false });
  }

  const goals = Array.isArray(b.goals) ? b.goals.filter(g => GOALS[g]).map(g => GOALS[g]) : [];
  const guests = Number.isInteger(b.guests) && b.guests > 0 && b.guests <= 2000 ? b.guests : null;
  const date = b.dateUnknown ? 'пока не определились' : (formatDate(str(b.date, 10)) || 'не указана');

  const lines = ['Заявка с сайта «Версаль»'];
  if (OCCASIONS[b.occasion]) lines.push('Повод: ' + OCCASIONS[b.occasion]);
  lines.push('Дата: ' + date);
  if (guests) lines.push('Гостей: около ' + guests);
  if (goals.length) lines.push('Интересует: ' + goals.join(', '));
  lines.push('Имя: ' + name);
  lines.push('Телефон: ' + phone + ' (удобнее: ' + (CONTACT[b.contactVia] || 'звонок') + ')');
  const comment = str(b.comment, 1500);
  if (comment) lines.push('Комментарий: ' + comment);

  try {
    const tg = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: lines.join('\n'), disable_web_page_preview: true })
    });
    if (!tg.ok) return res.status(502).json({ ok: false });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(502).json({ ok: false });
  }
};
