import { readEnv } from "./env";

/**
 * Outgoing e-mail, through Mailgun like the other products (`MAIL_PROVIDER=mailgun`). Fails closed: without a provider nothing is
 * sent and the answer says so (the callers answer the person the same either way). Never logs the address, the link or a key.
 */
export type MailResult = "sent" | "not_configured" | "failed";

export interface Mail {
  to: string;
  subject: string;
  text: string;
}

export async function sendMail(mail: Mail, send: typeof fetch = fetch, env: Record<string, string | undefined> = process.env): Promise<MailResult> {
  const e = readEnv(env);
  if (e.MAIL_PROVIDER !== "mailgun" || !e.MAIL_API_KEY || !e.MAIL_DOMAIN) return "not_configured";
  const from = e.MAIL_FROM || `Yororis <no-reply@${e.MAIL_DOMAIN}>`;
  const auth = Buffer.from(`api:${e.MAIL_API_KEY}`).toString("base64");
  try {
    const res = await send(`${e.MAIL_API_URL.replace(/\/+$/, "")}/v3/${encodeURIComponent(e.MAIL_DOMAIN)}/messages`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ from, to: mail.to, subject: mail.subject, text: mail.text }),
    });
    return res.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}
