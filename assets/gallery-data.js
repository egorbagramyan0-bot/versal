/*
 * Галерея событий «Версаля».
 *
 * Сейчас здесь ПРИМЕР для оценки оформления: события и даты условные, фото — снимки зала.
 * Когда будут фото реальных праздников (с согласием заказчиков) — замените events и поставьте sample: false.
 *
 * Формат события:
 *   { title: 'Свадьба', date: 'июнь 2026', cover: 'путь к обложке', photos: [{ src: 'путь', alt: 'описание' }] }
 *   cover можно не указывать — тогда обложкой станет первое фото.
 */
window.VERSAL_GALLERY = {
  sample: true,
  events: [
    {
      title: 'Свадьба', date: 'июнь 2026',
      photos: [
        { src: 'assets/img/hall-1.webp', alt: 'Зал с люстрами и длинными столами' },
        { src: 'assets/img/hall-3.webp', alt: 'Накрытые банкетные столы' },
        { src: 'assets/img/chandelier.webp', alt: 'Люстра в потолочном куполе' },
        { src: 'assets/img/hall-2.webp', alt: 'Общий вид зала' }
      ]
    },
    {
      title: 'Юбилей', date: 'май 2026',
      photos: [
        { src: 'assets/img/hall-2.webp', alt: 'Общий вид зала' },
        { src: 'assets/img/hall-4.webp', alt: 'Стены с классическими панелями' },
        { src: 'assets/img/hall-3.webp', alt: 'Накрытые банкетные столы' }
      ]
    },
    {
      title: 'Сватовство', date: 'апрель 2026',
      photos: [
        { src: 'assets/img/hall-4.webp', alt: 'Длинный стол у стены с панелями' },
        { src: 'assets/img/hall-1.webp', alt: 'Зал с люстрами' },
        { src: 'assets/img/corridor.webp', alt: 'Светлый коридор с бра' }
      ]
    },
    {
      title: 'Корпоратив', date: 'март 2026',
      photos: [
        { src: 'assets/img/hall-3.webp', alt: 'Банкетные столы' },
        { src: 'assets/img/hall-2.webp', alt: 'Зал с люстрами' },
        { src: 'assets/img/chandelier.webp', alt: 'Люстра' }
      ]
    },
    {
      title: 'Семейное торжество', date: 'февраль 2026',
      photos: [
        { src: 'assets/img/gallery-light.webp', alt: 'Светлая галерея со скульптурой' },
        { src: 'assets/img/bust.webp', alt: 'Скульптура в галерее' },
        { src: 'assets/img/hall-1.webp', alt: 'Банкетный зал' }
      ]
    }
  ]
};
