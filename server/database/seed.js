require('dotenv').config();
const db = require('./db');

async function seed() {
  try {
    console.log('🌱 Seeding database...');

    // Check if course already exists
    const existingCourse = await db.query(`
      SELECT id FROM courses WHERE title = $1
    `, ['Общайся легко - на Лазурке!']);

    let courseId;

    if (existingCourse.rows.length > 0) {
      courseId = existingCourse.rows[0].id;
      console.log(`✅ Course already exists with ID: ${courseId}`);
    } else {
      // Insert main course only if it doesn't exist
      const courseResult = await db.query(`
        INSERT INTO courses (title, description, price, currency, access_duration_days)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [
        'Общайся легко - на Лазурке!',
        'Мини-курс французского языка для туристов на Французской Ривьере',
        45.00,
        'EUR',
        60
      ]);
      courseId = courseResult.rows[0].id;
      console.log(`✅ Course created with ID: ${courseId}`);
    }

    // Insert lessons
    const lessons = [
      {
        lesson_number: 1,
        title: 'Bonjour, Côte d\'Azur!',
        description: 'Основные приветствия, представление, вежливые фразы',
        duration_minutes: 18
      },
      {
        lesson_number: 2,
        title: 'Promenade des Anglais и пляжи',
        description: 'Как спросить дорогу, заказать лежак, общение на пляже',
        duration_minutes: 20
      },
      {
        lesson_number: 3,
        title: 'Транспорт по Лазурке',
        description: 'Поезд TER, автобус, яхта - покупка билетов и навигация',
        duration_minutes: 17
      },
      {
        lesson_number: 4,
        title: 'Отель и апартаменты',
        description: 'Заселение, просьбы на ресепшн, решение проблем в номере',
        duration_minutes: 19
      },
      {
        lesson_number: 5,
        title: 'Провансальская кухня',
        description: 'Ресторан, меню, заказ блюд и напитков, счёт',
        duration_minutes: 22
      },
      {
        lesson_number: 6,
        title: 'Шопинг и рынки',
        description: 'Как спросить цену, торговаться, примерка одежды',
        duration_minutes: 16
      },
      {
        lesson_number: 7,
        title: 'Достопримечательности',
        description: 'Покупка билетов в музеи, парки, экскурсии',
        duration_minutes: 15
      },
      {
        lesson_number: 8,
        title: 'Яхты, Монако и казино',
        description: 'Специальная лексика для VIP-локаций Ривьеры',
        duration_minutes: 21
      },
      {
        lesson_number: 9,
        title: 'Экстренные фразы',
        description: 'Аптека, полиция, потерянные вещи, медицинская помощь',
        duration_minutes: 14
      },
      {
        lesson_number: 10,
        title: 'Прощание и «je reviens!»',
        description: 'Как красиво попрощаться и пообещать вернуться',
        duration_minutes: 13
      }
    ];

    for (const lesson of lessons) {
      await db.query(`
        INSERT INTO lessons (course_id, lesson_number, title, description, duration_minutes)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (course_id, lesson_number) DO NOTHING
      `, [courseId, lesson.lesson_number, lesson.title, lesson.description, lesson.duration_minutes]);
    }

    console.log(`✅ ${lessons.length} lessons created`);

    // Create test user
    const testUserResult = await db.query(`
      INSERT INTO users (email, name, access_code)
      VALUES ($1, $2, $3)
      ON CONFLICT (email) DO UPDATE SET access_code = $3
      RETURNING id
    `, ['test@example.com', 'Test User', 'TEST123']);

    const testUserId = testUserResult.rows[0].id;
    console.log(`✅ Test user created (email: test@example.com, code: TEST123)`);

    // Create test enrollment
    await db.query(`
      INSERT INTO enrollments (user_id, course_id, status, expires_at)
      VALUES ($1, $2, $3, NOW() + INTERVAL '60 days')
      ON CONFLICT (user_id, course_id) DO UPDATE
      SET status = 'active', expires_at = NOW() + INTERVAL '60 days'
    `, [testUserId, courseId, 'active']);

    console.log(`✅ Test enrollment created (expires in 60 days)`);
    console.log('🎉 Database seeded successfully');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
