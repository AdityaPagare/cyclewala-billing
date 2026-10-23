/* Sending email through Gmail (or any SMTP): set SMTP_USER and SMTP_PASS (a Gmail App password, not the normal
 * password). MAIL_DRY_RUN=true prints the mail to the server log instead of sending, for testing. */
import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";

export const mailConfigured = () => process.env.MAIL_DRY_RUN === "true" || !!(process.env.SMTP_USER && process.env.SMTP_PASS);

export type Attachment = { filename: string; content: Buffer | Uint8Array; contentType: string };

export async function sendMail(m: { to: string; subject: string; html: string; text: string; fromName?: string; replyTo?: string; attachments?: Attachment[] }) {
  if (!mailConfigured()) throw new Error("Email is not set up. Add SMTP_USER and SMTP_PASS (a Gmail App password) to the server settings.");
  const dry = process.env.MAIL_DRY_RUN === "true";
  const transport = dry
    ? nodemailer.createTransport({ jsonTransport: true })
    : nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: Number(process.env.SMTP_PORT) || 465,
        secure: (Number(process.env.SMTP_PORT) || 465) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
  const info = await transport.sendMail({
    from: `"${(m.fromName || "Cycle Wala").replace(/["\r\n]/g, "")}" <${process.env.SMTP_USER || "no-reply@cyclewala.shop"}>`,
    to: m.to,
    replyTo: m.replyTo,
    subject: m.subject,
    html: m.html,
    text: m.text,
    attachments: m.attachments?.map((a) => ({ filename: a.filename, content: Buffer.from(a.content), contentType: a.contentType })),
  });
  if (dry) {
    // keep the last dry-run email so its look can be checked: <data folder>/last-mail.html
    const dir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(process.cwd(), "data");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "last-mail.html"), m.html);
    fs.writeFileSync(path.join(dir, "last-mail.txt"), m.text);
    for (const a of m.attachments ?? []) fs.writeFileSync(path.join(dir, "last-mail-attachment-" + a.filename.replace(/[^A-Za-z0-9._-]/g, "_")), Buffer.from(a.content));
    console.log("[mail:dry-run]", m.to, m.subject);
  }
  return info.messageId;
}
