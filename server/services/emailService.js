const nodemailer = require('nodemailer');
const db = require('../database/db');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Email templates
const templates = {
  payment_success: (data) => ({
    subject: 'Доступ к курсу французского языка / Access to French Course',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #667eea;">🇫🇷 Добро пожаловать на курс!</h2>
        <p>Спасибо за покупку курса "Общайся легко - на Лазурке!"</p>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3>Ваш код доступа:</h3>
          <p style="font-size: 24px; font-weight: bold; color: #667eea; letter-spacing: 2px;">
            ${data.accessCode}
          </p>
        </div>

        <p>Используйте этот код для входа в личный кабинет:</p>
        <p><a href="${data.courseUrl}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Войти в личный кабинет
        </a></p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">

        <h3>Что дальше?</h3>
        <ul>
          <li>Войдите в личный кабинет, используя ваш email и код доступа</li>
          <li>Начните проходить уроки в удобном для вас темпе</li>
          <li>Скачайте PDF материалы для офлайн-использования</li>
          <li>У вас есть 60 дней доступа к курсу</li>
        </ul>

        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          Если у вас возникли вопросы, просто ответьте на это письмо.
        </p>

        <p style="color: #666; font-size: 12px; margin-top: 20px;">
          С уважением,<br>
          Команда "Общайся легко - на Лазурке!"
        </p>
      </div>
    `,
  }),

  access_code_reminder: (data) => ({
    subject: 'Ваш код доступа к курсу',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #667eea;">Ваш код доступа</h2>
        <p>Вы запросили напоминание кода доступа к курсу.</p>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3>Код доступа:</h3>
          <p style="font-size: 24px; font-weight: bold; color: #667eea; letter-spacing: 2px;">
            ${data.accessCode}
          </p>
        </div>

        <p>Используйте этот код для входа в личный кабинет.</p>

        <p style="color: #666; font-size: 12px; margin-top: 20px;">
          С уважением,<br>
          Команда "Общайся легко - на Лазурке!"
        </p>
      </div>
    `,
  }),

  enrollment_expiring: (data) => ({
    subject: 'Срок доступа к курсу истекает',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #667eea;">⏰ Напоминание о доступе к курсу</h2>
        <p>Ваш доступ к курсу "${data.courseTitle}" истекает через ${data.daysLeft} дней.</p>

        <p>Не забудьте завершить все уроки и скачать материалы!</p>

        <p><a href="${data.courseUrl}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Перейти к урокам
        </a></p>

        <p style="color: #666; font-size: 12px; margin-top: 20px;">
          С уважением,<br>
          Команда "Общайся легко - на Лазурке!"
        </p>
      </div>
    `,
  }),
};

// Send email function
async function sendEmail({ to, subject, template, data }) {
  try {
    const emailTemplate = templates[template];
    if (!emailTemplate) {
      throw new Error(`Template ${template} not found`);
    }

    const { subject: templateSubject, html } = emailTemplate(data);
    const finalSubject = subject || templateSubject;

    // Log email attempt
    const logResult = await db.query(
      `INSERT INTO email_logs (email, subject, template, status)
       VALUES ($1, $2, $3, 'pending') RETURNING id`,
      [to, finalSubject, template]
    );
    const logId = logResult.rows[0].id;

    // Send email
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"French Course" <noreply@french-course.com>',
      to,
      subject: finalSubject,
      html,
    });

    // Update log
    await db.query(
      `UPDATE email_logs SET status = 'sent', sent_at = NOW() WHERE id = $1`,
      [logId]
    );

    console.log(`✅ Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('Email sending error:', error);

    // Log error
    if (logId) {
      await db.query(
        `UPDATE email_logs SET status = 'failed', error_message = $1 WHERE id = $2`,
        [error.message, logId]
      );
    }

    throw error;
  }
}

// Verify email configuration
async function verifyEmailConfig() {
  try {
    await transporter.verify();
    console.log('✅ Email service is ready');
    return true;
  } catch (error) {
    console.error('❌ Email service configuration error:', error);
    return false;
  }
}

module.exports = {
  sendEmail,
  verifyEmailConfig,
};
