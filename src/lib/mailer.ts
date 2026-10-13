import nodemailer from "nodemailer";

export interface EmailPayload {
  to: string;
  subject: string;
  heading: string;
  subHeading?: string;
  bodyHtml: string;
  bodyText: string;
}

export async function sendPortalEmail(payload: EmailPayload): Promise<boolean> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom =
    process.env.SMTP_FROM || `"Logix Internship Portal" <portal@logix.dev>`;

  const htmlTemplate = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #0b1f3a; max-width: 620px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background: #ffffff;">
      <div style="background-color: #0b1f3a; padding: 24px 28px; color: #ffffff;">
        <div style="font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: #1fc8aa; font-weight: 600; margin-bottom: 4px;">
          LOGIX INTERNSHIP MANAGEMENT PORTAL
        </div>
        <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff;">${payload.heading}</h2>
        ${
          payload.subHeading
            ? `<p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 13px;">${payload.subHeading}</p>`
            : ""
        }
      </div>
      <div style="padding: 24px 28px; font-size: 14px; color: #334155;">
        ${payload.bodyHtml}
      </div>
      <div style="background-color: #f4f6fa; padding: 14px 28px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #5b6b84; text-align: center;">
        © 2026 Logix Technologies Inc. · Official Internship Lifecycle Notification
      </div>
    </div>
  `;

  console.log(
    `[PORTAL EMAIL] To: ${payload.to} | Subject: ${payload.subject}`,
  );

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
      await transporter.sendMail({
        from: smtpFrom,
        to: payload.to,
        subject: payload.subject,
        text: payload.bodyText,
        html: htmlTemplate,
      });
      return true;
    } catch (error) {
      console.error("[PORTAL EMAIL ERROR]", error);
      return false;
    }
  }

  // Simulated delivery when SMTP is not configured in local environment
  return true;
}

