/**
 * Boshlang'ich ma'lumotlar: kurslar va kontaktlar.
 * Narx va davomiylik ataylab bo'sh — admin paneldan to'ldiriladi
 * (bo'sh bo'lsa saytda "Narxi: bog'laning" ko'rinadi).
 */
'use strict';

const courses = [
  {
    slug: 'frontend-developer',
    icon: 'code',
    name: { uz: 'Frontend Developer', ru: 'Frontend-разработчик', en: 'Frontend Developer' },
    short: {
      uz: 'Dasturlash asoslarini noldan oʻrganib, zamonaviy va moslashuvchan veb-saytlar yaratishni oʻrganing.',
      ru: 'Изучите основы программирования с нуля и научитесь создавать современные адаптивные сайты.',
      en: 'Learn programming from scratch and build modern, responsive websites.',
    },
    description: {
      uz:
        'Frontend dasturchi — foydalanuvchi koʻradigan va bosadigan hamma narsani: sahifalar, tugmalar, formalar va animatsiyalarni yaratadigan mutaxassis. Bu IT olamiga kirish uchun eng qulay va talab yuqori yoʻnalishlardan biri.\n\nKurs dasturlashni hech qachon oʻrganmaganlar uchun moʻljallangan. Asoslardan boshlab, har bir mavzuni amaliy topshiriqlar orqali mustahkamlaymiz va kurs davomida portfolio uchun real loyihalar yaratamiz. Kod yozishda sunʼiy intellekt vositalaridan toʻgʻri foydalanishni ham oʻrganasiz.',
      ru:
        'Frontend-разработчик создаёт всё, что пользователь видит и нажимает на сайте: страницы, кнопки, формы и анимации. Это одно из самых доступных и востребованных направлений для входа в IT.\n\nКурс рассчитан на тех, кто никогда не программировал. Начинаем с основ, закрепляем каждую тему практическими заданиями и в ходе обучения создаём реальные проекты для портфолио. Вы также научитесь грамотно использовать инструменты искусственного интеллекта при написании кода.',
      en:
        'A frontend developer builds everything users see and click on a website: pages, buttons, forms and animations. It is one of the most accessible and in-demand ways to start a career in IT.\n\nThe course is designed for complete beginners. We start with the fundamentals, reinforce every topic with hands-on exercises and build real portfolio projects along the way. You will also learn to use AI tools effectively while writing code.',
    },
    learn: {
      uz: [
        'HTML va CSS: sahifa tuzilishi va zamonaviy dizayn',
        'Moslashuvchan (responsive) maketlar: Flexbox va Grid',
        'JavaScript: dasturlash asoslari va sahifani jonlantirish',
        'Git va GitHub bilan ishlash',
        'AI yordamchilar bilan kod yozish va xatolarni topish',
        'Portfolio uchun toʻliq veb-sayt yaratish',
      ],
      ru: [
        'HTML и CSS: структура страницы и современный дизайн',
        'Адаптивная вёрстка: Flexbox и Grid',
        'JavaScript: основы программирования и интерактивность',
        'Работа с Git и GitHub',
        'Написание кода и поиск ошибок с помощью AI-ассистентов',
        'Создание полноценного сайта для портфолио',
      ],
      en: [
        'HTML and CSS: page structure and modern design',
        'Responsive layouts with Flexbox and Grid',
        'JavaScript: programming basics and interactivity',
        'Working with Git and GitHub',
        'Writing and debugging code with AI assistants',
        'Building a complete website for your portfolio',
      ],
    },
  },
  {
    slug: 'smm',
    icon: 'megaphone',
    name: { uz: 'SMM', ru: 'SMM', en: 'SMM' },
    short: {
      uz: 'Biznes sahifalarini yuritish, kontent yaratish va target reklama bilan mijoz jalb qilishni oʻrganing.',
      ru: 'Научитесь вести бизнес-страницы, создавать контент и привлекать клиентов таргетированной рекламой.',
      en: 'Learn to run business pages, create content and attract customers with targeted ads.',
    },
    description: {
      uz:
        'SMM (Social Media Marketing) mutaxassisi bizneslarning Instagram, Telegram va boshqa ijtimoiy tarmoqlardagi sahifalarini yuritadi: kontent tayyorlaydi, auditoriya bilan ishlaydi va reklama orqali yangi mijozlar jalb qiladi.\n\nKursda biznes sahifasini noldan boshlab rivojlantirish, sotadigan kontent yaratish va target reklamani sozlashni amalda oʻrganasiz. Gʻoya topish, matn yozish va vizual kontent tayyorlashda sunʼiy intellektdan foydalanishni ham oʻrgatamiz.',
      ru:
        'SMM-специалист (Social Media Marketing) ведёт страницы бизнеса в Instagram, Telegram и других соцсетях: готовит контент, работает с аудиторией и привлекает новых клиентов с помощью рекламы.\n\nНа курсе вы на практике научитесь развивать бизнес-страницу с нуля, создавать продающий контент и настраивать таргетированную рекламу. Также научим использовать искусственный интеллект для поиска идей, написания текстов и подготовки визуального контента.',
      en:
        'An SMM (Social Media Marketing) specialist runs business pages on Instagram, Telegram and other social networks: creates content, engages the audience and brings in new customers through advertising.\n\nIn this course you will learn, hands-on, how to grow a business page from scratch, create content that sells and set up targeted advertising. We will also show you how to use artificial intelligence to generate ideas, write copy and prepare visual content.',
    },
    learn: {
      uz: [
        'Biznes sahifasi uchun strategiya va kontent-reja tuzish',
        'Foto va video kontent yaratish (Reels, Stories)',
        'Sotadigan matnlar yozish (kopirayting)',
        'Target reklamani sozlash va byudjetni boshqarish',
        'Statistika tahlili va natijalarni oʻlchash',
        'Kontent yaratishda AI vositalaridan foydalanish',
      ],
      ru: [
        'Стратегия и контент-план для бизнес-страницы',
        'Создание фото- и видеоконтента (Reels, Stories)',
        'Продающие тексты (копирайтинг)',
        'Настройка таргетированной рекламы и управление бюджетом',
        'Анализ статистики и оценка результатов',
        'AI-инструменты для создания контента',
      ],
      en: [
        'Strategy and content plan for a business page',
        'Creating photo and video content (Reels, Stories)',
        'Writing copy that sells',
        'Setting up targeted ads and managing the budget',
        'Analyzing statistics and measuring results',
        'Using AI tools to create content',
      ],
    },
  },
  {
    slug: 'suniy-intellekt',
    icon: 'sparkles',
    name: { uz: 'Sunʼiy intellekt (AI)', ru: 'Искусственный интеллект (AI)', en: 'Artificial Intelligence (AI)' },
    short: {
      uz: 'AI vositalaridan kasbiy maqsadda foydalanib, ishingizni tezroq va sifatliroq bajarishni oʻrganing.',
      ru: 'Научитесь применять AI-инструменты в работе, чтобы делать её быстрее и качественнее.',
      en: 'Learn to use AI tools professionally to work faster and deliver better results.',
    },
    description: {
      uz:
        'Sunʼiy intellekt bugun deyarli har bir kasbda ishlatilmoqda: matn yozish, rasm va video yaratish, maʼlumotlarni tahlil qilish, kundalik ishlarni avtomatlashtirish. Uni toʻgʻri qoʻllay oladigan mutaxassislar ish bozorida ancha ustun turadi.\n\nKursda AI vositalarining imkoniyatlari va cheklovlarini tushunib, ulardan oʻqish, ish va biznesda amaliy foydalanishni oʻrganasiz. Har bir darsda real vazifalarni AI yordamida bajarib, natijani darhol koʻrasiz.',
      ru:
        'Искусственный интеллект сегодня применяется почти в каждой профессии: написание текстов, создание изображений и видео, анализ данных, автоматизация рутинных задач. Специалисты, которые умеют им грамотно пользоваться, заметно выигрывают на рынке труда.\n\nНа курсе вы разберётесь в возможностях и ограничениях AI-инструментов и научитесь применять их в учёбе, работе и бизнесе. На каждом занятии вы решаете реальные задачи с помощью AI и сразу видите результат.',
      en:
        'Artificial intelligence is now used in almost every profession: writing, creating images and video, analyzing data and automating routine tasks. Specialists who know how to use it well have a clear advantage on the job market.\n\nIn this course you will understand what AI tools can and cannot do and learn to apply them in your studies, work and business. In every class you solve real tasks with AI and see the results right away.',
    },
    learn: {
      uz: [
        'AI qanday ishlaydi: imkoniyatlar va cheklovlar',
        'AI chat-yordamchilar bilan samarali ishlash (prompt yozish)',
        'AI yordamida matn, rasm va video yaratish',
        'Hujjatlar, jadvallar va taqdimotlarda AI dan foydalanish',
        'Kundalik ishlarni avtomatlashtirish',
        'AI dan xavfsiz va masʼuliyatli foydalanish',
      ],
      ru: [
        'Как работает AI: возможности и ограничения',
        'Эффективная работа с AI-ассистентами (промптинг)',
        'Создание текстов, изображений и видео с помощью AI',
        'AI в документах, таблицах и презентациях',
        'Автоматизация повседневных задач',
        'Безопасное и ответственное использование AI',
      ],
      en: [
        'How AI works: capabilities and limitations',
        'Working effectively with AI assistants (prompting)',
        'Creating text, images and video with AI',
        'Using AI in documents, spreadsheets and presentations',
        'Automating everyday tasks',
        'Using AI safely and responsibly',
      ],
    },
  },
  {
    slug: 'kompyuter-savodxonligi',
    icon: 'monitor',
    name: { uz: 'Kompyuter savodxonligi', ru: 'Компьютерная грамотность', en: 'Computer Literacy' },
    short: {
      uz: 'Kompyuterdan professional foydalanish, Word va Excel dasturlarida ishlashni oʻrganing.',
      ru: 'Научитесь уверенно пользоваться компьютером и работать в Word и Excel.',
      en: 'Learn to use a computer professionally and work confidently in Word and Excel.',
    },
    description: {
      uz:
        'Kompyuter savodxonligi — bugungi kunda har qanday ish va oʻqish uchun zarur boʻlgan asosiy koʻnikma. Kurs kompyuter bilan endi tanishayotganlar va bilimini tartibga solmoqchi boʻlganlar uchun moʻljallangan.\n\nKompyuter va internetdan xavfsiz foydalanish, hujjatlar bilan ishlash, Word va Excel dasturlarida professional darajada ishlashni amaliy mashgʻulotlar orqali oʻrganasiz. Ofis ishlarini tezlashtirishda AI yordamchilardan foydalanishni ham koʻrsatamiz.',
      ru:
        'Компьютерная грамотность — базовый навык, необходимый сегодня для любой работы и учёбы. Курс подойдёт тем, кто только знакомится с компьютером, и тем, кто хочет систематизировать свои знания.\n\nНа практических занятиях вы научитесь безопасно пользоваться компьютером и интернетом, работать с документами и на профессиональном уровне владеть Word и Excel. Также покажем, как ускорить офисную работу с помощью AI-ассистентов.',
      en:
        'Computer literacy is an essential skill for any job or study today. The course is designed both for those just getting started with computers and for those who want to put their knowledge in order.\n\nThrough hands-on practice you will learn to use a computer and the internet safely, manage documents and work in Word and Excel at a professional level. We will also show you how AI assistants can speed up your office work.',
    },
    learn: {
      uz: [
        'Windows bilan ishlash: fayllar, papkalar va sozlamalar',
        'Tez va toʻgʻri yozish (klaviatura bilan ishlash)',
        'Microsoft Word: hujjatlarni rasmiylashtirish',
        'Microsoft Excel: jadvallar, formulalar va diagrammalar',
        'Internet, elektron pochta va xavfsizlik',
        'Ofis ishlarida AI yordamchilardan foydalanish',
      ],
      ru: [
        'Работа в Windows: файлы, папки и настройки',
        'Быстрый и грамотный набор текста',
        'Microsoft Word: оформление документов',
        'Microsoft Excel: таблицы, формулы и диаграммы',
        'Интернет, электронная почта и безопасность',
        'AI-ассистенты в офисной работе',
      ],
      en: [
        'Working in Windows: files, folders and settings',
        'Fast and accurate typing',
        'Microsoft Word: formatting documents',
        'Microsoft Excel: tables, formulas and charts',
        'Internet, email and online safety',
        'Using AI assistants for office tasks',
      ],
    },
  },
];

const contacts = {
  phones: ['+998903662233', '+998772543525', '+998917382266'],
  address: {
    uz: 'Fargʻona viloyati, Qoʻqon shahri, Turon koʻchasi, 76-uy',
    ru: 'Ферганская область, г. Коканд, ул. Турон, 76',
    en: '76 Turon Street, Kokand, Fergana Region, Uzbekistan',
  },
  // Ish vaqti Yandex Xaritalardagi ma'lumotdan olingan — o'zgarsa admin paneldan yangilang
  hours: {
    uz: 'Dushanba – Shanba: 09:00 – 22:00, Yakshanba: dam olish kuni',
    ru: 'Понедельник – суббота: 09:00 – 22:00, воскресенье — выходной',
    en: 'Monday – Saturday: 9:00 AM – 10:00 PM, Sunday: closed',
  },
  email: '',
  instagram: 'https://www.instagram.com/proteachuz/',
  telegram: '',
  facebook: '',
  youtube: '',
  mapLink: 'https://yandex.ru/maps/org/pro_teach/62451106245/',
  mapEmbed: 'https://yandex.ru/map-widget/v1/?oid=62451106245&ol=biz&z=16',
};

module.exports = { courses, contacts };
