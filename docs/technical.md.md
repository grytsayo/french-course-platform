# 🔧 ТЕХНИЧЕСКАЯ ДОКУМЕНТАЦИЯ
# Платформа курса "Общайся легко - на Лазурке!"

## 📐 АРХИТЕКТУРА СИСТЕМЫ:

```
┌─────────────────────────────────────────────────────────┐
│                    ПОЛЬЗОВАТЕЛЬ                          │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              course-index.html                           │
│          (Лендинг продажи курса)                        │
│  • Описание курса                                       │
│  • Программа 10 уроков                                  │
│  • Цена: 45€                                            │
│  • Кнопка "Купить"                                      │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              payment.html                                │
│          (Страница оплаты)                              │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   ЮKassa     │  │    Stripe    │  │    Crypto    │  │
│  │  (РФ карты)  │  │  (Междунар.) │  │  (BTC/USDT)  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────┬───────────────────────────────────┘
                      │
            ┌─────────┴─────────┐
            │   Оплата успешна  │
            │                   │
            │  1. Генерация кода│
            │  2. Email клиенту │
            │  3. Сохранение в БД│
            └─────────┬─────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              login.html                                  │
│          (Вход в систему)                               │
│  • Ввод Email                                           │
│  • Ввод кода доступа                                    │
│  • Проверка срока действия                              │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              dashboard.html                              │
│          (Личный кабинет)                               │
│  • Список всех 10 уроков                                │
│  • Прогресс прохождения                                 │
│  • Счётчик оставшихся дней                              │
│  • Кнопки "Начать урок"                                 │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              lesson.html                                 │
│          (Страница урока)                               │
│  • Видео плеер (YouTube/Vimeo)                          │
│  • Скачать PDF конспект                                 │
│  • Скачать MP3 аудио                                    │
│  • Кнопка "Отметить как пройденный"                     │
│  • Навигация (пред./след. урок)                         │
└─────────────────────────────────────────────────────────┘
```

---

## 💾 ХРАНЕНИЕ ДАННЫХ:

### LocalStorage (текущая реализация):

```javascript
// Данные пользователя
{
  "courseUser": {
    "email": "user@example.com",
    "accessCode": "ABC123XYZ",
    "purchaseDate": "2024-01-15",
    "expiryDate": "2024-03-15",
    "loginTime": "2024-01-15T10:30:00"
  }
}

// Прогресс прохождения
{
  "courseProgress": {
    "1": true,  // Урок 1 пройден
    "2": true,  // Урок 2 пройден
    "3": false, // Урок 3 не пройден
    ...
  }
}
```

### Рекомендуемая БД (для production):

```
ТАБЛИЦА: users
┌──────────┬──────────────┬────────────┬──────────────┬──────────────┐
│ user_id  │ email        │ name       │ access_code  │ purchase_date│
├──────────┼──────────────┼────────────┼──────────────┼──────────────┤
│ 1        │ user@mail.ru │ Иван       │ ABC123       │ 2024-01-15   │
└──────────┴──────────────┴────────────┴──────────────┴──────────────┘

ТАБЛИЦА: progress
┌──────────┬───────────┬────────────┬──────────────────┐
│ user_id  │ lesson_id │ completed  │ completed_date   │
├──────────┼───────────┼────────────┼──────────────────┤
│ 1        │ 1         │ true       │ 2024-01-16       │
│ 1        │ 2         │ true       │ 2024-01-17       │
└──────────┴───────────┴────────────┴──────────────────┘
```

---

## 🔐 СИСТЕМА БЕЗОПАСНОСТИ:

### Генерация кодов доступа:

```javascript
function generateAccessCode() {
    // Генерируем уникальный код из 10 символов
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 10; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}
```

### Проверка срока действия:

```javascript
function checkAccess(user) {
    const expiryDate = new Date(user.expiryDate);
    const now = new Date();
    
    if (now > expiryDate) {
        return { valid: false, message: 'Доступ истёк' };
    }
    
    const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
    return { valid: true, daysLeft: daysLeft };
}
```

---

## 📧 АВТОМАТИЗАЦИЯ EMAIL:

### Шаблон письма после покупки:

```
Тема: Ваш доступ к курсу "Общайся легко - на Лазурке!"

Здравствуйте, {{user_name}}! 🇫🇷

Спасибо за покупку курса французского языка для туристов!

🔑 ДАННЫЕ ДЛЯ ВХОДА:
────────────────────
Email: {{user_email}}
Код доступа: {{access_code}}

🌐 ССЫЛКА ДЛЯ ВХОДА:
https://ваш-сайт.com/login.html

📚 ЧТО ВАС ЖДЁТ:
• 10 практических видео-уроков
• PDF конспекты с фразами
• Аудио-файлы для прослушивания
• Доступ на 60 дней

⏰ Ваш доступ активен до: {{expiry_date}}

Приятного обучения!
С уважением,
Команда AzurEpicTours 🌊

P.S. Если есть вопросы - пишите на support@azurepictours.com
```

---

## 🎨 ДИЗАЙН СИСТЕМА:

### Цветовая палитра:

```css
/* Основные цвета */
--primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
--primary-color: #667eea;
--secondary-color: #764ba2;

/* Фоновые */
--bg-light: #f8f9fa;
--bg-white: #ffffff;

/* Текст */
--text-dark: #2d3748;
--text-medium: #666666;
--text-light: #999999;

/* Статусы */
--success-color: #48bb78;
--error-color: #f56565;
--warning-color: #ed8936;
```

### Типографика:

```css
/* Заголовки */
h1 { font-size: 2-3rem; font-weight: bold; }
h2 { font-size: 2rem; font-weight: bold; }
h3 { font-size: 1.5rem; font-weight: 600; }

/* Основной текст */
body { font-size: 1rem; line-height: 1.6; }
p { margin-bottom: 1rem; }

/* Кнопки */
button { font-size: 1.1rem; font-weight: bold; }
```

---

## 📱 АДАПТИВНОСТЬ:

### Breakpoints:

```css
/* Мобильные телефоны */
@media (max-width: 480px) {
    /* Стили для телефонов */
}

/* Планшеты */
@media (max-width: 768px) {
    /* Стили для планшетов */
}

/* Десктоп */
@media (min-width: 1200px) {
    /* Стили для больших экранов */
}
```

---

## 🚀 ПРОИЗВОДИТЕЛЬНОСТЬ:

### Оптимизация:

1. **Lazy Loading для видео:**
   ```html
   <iframe loading="lazy" src="..."></iframe>
   ```

2. **Минификация CSS:**
   - Удалить комментарии
   - Сжать пробелы
   - Объединить селекторы

3. **Кэширование:**
   ```html
   <meta http-equiv="Cache-Control" content="max-age=31536000">
   ```

4. **CDN для видео:**
   - YouTube (бесплатно)
   - Cloudflare Stream ($5/1000 минут)

---

## 📊 МЕТРИКИ И АНАЛИТИКА:

### Что отслеживать:

```javascript
// События для отслеживания
gtag('event', 'page_view', {
    page_title: 'Course Landing',
    page_location: window.location.href
});

gtag('event', 'purchase', {
    value: 45,
    currency: 'EUR'
});

gtag('event', 'video_start', {
    video_title: 'Lesson 1'
});

gtag('event', 'lesson_complete', {
    lesson_number: 1
});
```

### KPI для отслеживания:

- Конверсия посетителей → покупатели
- Процент завершения курса
- Средний прогресс студента
- Самые популярные уроки
- Точки отвала (где студенты бросают)

---

## 🔧 API ENDPOINTS (для backend):

```
POST /api/create-payment
Body: { amount, email, name }
Response: { paymentUrl, orderId }

POST /api/verify-payment
Body: { orderId, transactionId }
Response: { success, accessCode }

GET /api/user-access
Headers: { Authorization: Bearer token }
Response: { valid, expiryDate, progress }

POST /api/mark-complete
Body: { userId, lessonId }
Response: { success, newProgress }
```

---

## 🛠️ ИНСТРУМЕНТЫ РАЗРАБОТКИ:

### Рекомендуемый стек:

**Frontend (текущий):**
- HTML5
- CSS3
- JavaScript (Vanilla)
- LocalStorage

**Backend (рекомендуется):**
- Node.js + Express.js
- или Python + Flask/FastAPI
- или PHP (если есть хостинг)

**База данных:**
- PostgreSQL (для production)
- MongoDB (NoSQL вариант)
- Firebase (быстрый старт)

**Платежи:**
- ЮKassa (РФ)
- Stripe (международные)
- Cryptomus (крипта)

**Email:**
- SendGrid
- Mailgun
- EmailJS (простой вариант)

**Хостинг:**
- GitHub Pages (бесплатно)
- Netlify (бесплатно)
- Vercel (бесплатно)
- DigitalOcean ($5/мес)

---

## 📈 МАСШТАБИРОВАНИЕ:

### Когда у вас будет 100+ студентов:

1. **Переход на базу данных**
   - Firebase Firestore
   - Supabase
   - PostgreSQL на Heroku

2. **Добавить backend**
   - Node.js API на Vercel
   - Serverless Functions

3. **CDN для контента**
   - Cloudflare
   - Amazon CloudFront

4. **Автоматизация**
   - Автоматическая отправка напоминаний
   - Email последовательности
   - Реферальная программа

---

## ✅ ЧЕКЛИСТ ГОТОВНОСТИ:

### Минимальная версия (MVP):

- [ ] Все 10 видео записаны
- [ ] Все 10 PDF созданы
- [ ] Видео загружены на YouTube
- [ ] PDF загружены на Google Drive
- [ ] Ссылки добавлены в код
- [ ] Протестирован весь флоу
- [ ] Сайт размещён онлайн

### Полная версия:

- [ ] Настроены платежи
- [ ] Автоотправка email
- [ ] База данных подключена
- [ ] Google Analytics установлен
- [ ] Куплен домен
- [ ] SSL сертификат настроен
- [ ] Backup система
- [ ] Политика конфиденциальности
- [ ] Оферта/договор

---

🎓 Готово к запуску! 🚀
