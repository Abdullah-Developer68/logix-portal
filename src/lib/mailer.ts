import nodemailer from "nodemailer";

export interface EmailPayload {
  to: string;
  subject: string;
  heading: string;
  subHeading?: string;
  bodyHtml: string;
  bodyText: string;
}

export function escapeHtml(input: unknown): string {
  const str = typeof input === "string" ? input : String(input ?? "");
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function isEmailEnabled(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim(),
  );
}

export async function sendPortalEmail(payload: EmailPayload): Promise<boolean> {
  if (!isEmailEnabled()) {
    return false;
  }

  const smtpHost = process.env.SMTP_HOST!.trim();
  const smtpPort = process.env.SMTP_PORT
    ? parseInt(process.env.SMTP_PORT, 10) || 587
    : 587;
  const smtpUser = process.env.SMTP_USER!.trim();
  const smtpPass = process.env.SMTP_PASS!;
  const smtpFrom =
    process.env.SMTP_FROM?.trim() ||
    '"Logix Internship Portal" <info@logixofficial.site>';

  const htmlTemplate = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #0b1f3a; max-width: 620px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background: #ffffff;">
      <div style="background-color: #0b1f3a; padding: 24px 28px; color: #ffffff;">
        <div style="font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: #1fc8aa; font-weight: 600; margin-bottom: 4px;">
          LOGIX INTERNSHIP MANAGEMENT PORTAL
        </div>
        <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff;">${escapeHtml(payload.heading)}</h2>
        ${
          payload.subHeading
            ? `<p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 13px;">${escapeHtml(payload.subHeading)}</p>`
            : ""
        }
      </div>
      <div style="padding: 24px 28px; font-size: 14px; color: #334155;">
        ${payload.bodyHtml}
      </div>
      <div style="background-color: #f4f6fa; padding: 14px 28px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #5b6b84; text-align: center;">
        © ${new Date().getFullYear()} Logix Technologies Inc. · Official Internship Lifecycle Notification
      </div>
    </div>
  `;

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
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
