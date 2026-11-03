/** Email goes through Resend. Without a key, features that need it say so instead of failing quietly. */
export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

const API = process.env.RESEND_BASE_URL || "https://api.resend.com";

export interface Email {
  to: string;
  subject: string;
  /** Paragraphs and lists as plain text. Lines starting with "• " become list items. */
  body: string;
  action?: { label: string; url: string };
}

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** A simple, readable layout that works in every mail app. */
function html({ subject, body, action }: Email) {
  const blocks = body.split(/\n{2,}/).map((block) => {
    const lines = block.split("\n");
    if (lines.every((l) => l.startsWith("• "))) {
      return `<ul style="padding-left:20px;margin:0 0 16px">${lines.map((l) => `<li style="margin:4px 0">${escape(l.slice(2))}</li>`).join("")}</ul>`;
    }
    return `<p style="margin:0 0 16px">${lines.map(escape).join("<br>")}</p>`;
  });
  const button = action
    ? `<p style="margin:24px 0"><a href="${escape(action.url)}" style="background:#6a35e0;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block">${escape(action.label)}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f5f3fb;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1c1530">
<div style="max-width:560px;margin:0 auto;padding:32px 24px">
<p style="font-size:20px;font-weight:700;margin:0 0 20px;color:#6a35e0">NEXUS OS</p>
<h1 style="font-size:20px;margin:0 0 16px">${escape(subject)}</h1>
${blocks.join("\n")}${button}
<p style="font-size:12px;color:#7a7390;margin-top:32px">You can change which emails you get in Settings.</p>
</div></body></html>`;
}

export async function sendEmail(email: Email) {
  if (!emailConfigured()) throw new Error("Email isn't set up on this server.");
  const text = email.action ? `${email.body}\n\n${email.action.label}: ${email.action.url}` : email.body;
  const res = await fetch(`${API}/emails`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: email.to, subject: email.subject, html: html(email), text }),
  });
  if (!res.ok) throw new Error(`Email failed with ${res.status}: ${await res.text()}`);
}
