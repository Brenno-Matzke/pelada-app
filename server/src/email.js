const sgMail = require('@sendgrid/mail');

const apiKey = process.env.SENDGRID_API_KEY;
const fromEmail = process.env.SENDGRID_FROM_EMAIL;
if (apiKey) sgMail.setApiKey(apiKey);

/** Send the password-reset email, or log the link to the console when
 *  SendGrid isn't configured yet (local dev without real credentials). */
async function sendPasswordResetEmail(toEmail, resetUrl) {
  if (!apiKey || !fromEmail) {
    console.log(`\n[email] SendGrid não configurado — link de redefinição de senha para ${toEmail}:`);
    console.log(`[email] ${resetUrl}\n`);
    return;
  }

  await sgMail.send({
    to: toEmail,
    from: fromEmail,
    subject: 'Redefinir sua senha — Pelada das Abelhas',
    text: `Clique no link para redefinir sua senha (válido por 1 hora): ${resetUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Redefinir sua senha</h2>
        <p>Recebemos um pedido para redefinir a senha da sua conta na Pelada das Abelhas.</p>
        <p><a href="${resetUrl}" style="background:#2fbf85;color:#0a2f1e;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Redefinir senha</a></p>
        <p style="color:#666;font-size:13px">Esse link expira em 1 hora. Se você não pediu isso, pode ignorar este e-mail.</p>
      </div>
    `,
  });
}

module.exports = { sendPasswordResetEmail };
