import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendVerificationEmail = async (email, token) => {
  const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${token}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'DAYFLOW — Verify Your Email',
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 480px; margin: auto; background: #0f1117; color: #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #fff; letter-spacing: 4px;">DAYFLOW</h1>
          <p style="margin: 8px 0 0; color: rgba(255,255,255,0.7); font-size: 13px;">The Human Operating System</p>
        </div>
        <div style="padding: 32px;">
          <h2 style="color: #e2e8f0; font-size: 20px; margin-bottom: 12px;">Verify your email</h2>
          <p style="color: #94a3b8; line-height: 1.6; margin-bottom: 24px;">Click the button below to verify your email address and activate your DAYFLOW account.</p>
          <a href="${verifyUrl}" style="display: inline-block; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">Verify Email →</a>
          <p style="color: #64748b; font-size: 12px; margin-top: 24px;">This link expires in 24 hours. If you didn't create a DAYFLOW account, ignore this email.</p>
        </div>
      </div>
    `,
  });
};

export const sendNotificationEmail = async (email, subject, message) => {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: `DAYFLOW — ${subject}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 480px; margin: auto; background: #0f1117; color: #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #fff; letter-spacing: 3px;">DAYFLOW</h1>
        </div>
        <div style="padding: 28px;">
          <h2 style="color: #e2e8f0; font-size: 18px; margin-bottom: 12px;">${subject}</h2>
          <p style="color: #94a3b8; line-height: 1.6;">${message}</p>
        </div>
      </div>
    `,
  });
};
