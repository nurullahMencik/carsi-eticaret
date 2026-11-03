import { Resend } from "resend";
import { db } from "@/lib/db";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  template: string;
};

export type EmailResult = { status: "SENT" | "LOGGED" | "FAILED"; id?: string; error?: string };

let client: Resend | null | undefined;
function resend(): Resend | null {
  if (client === undefined) {
    const key = process.env.RESEND_API_KEY?.trim();
    client = key ? new Resend(key) : null;
  }
  return client;
}

/**
 * Sends through Resend when RESEND_API_KEY is set; otherwise the message is only logged
 * (console + EmailLog table). Never throws: a failed e-mail must not break checkout.
 */
export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  let result: EmailResult;
  const api = resend();
  if (!api) {
    console.info(`[carsi][email:logged] to=${message.to} template=${message.template} subject="${message.subject}"`);
    result = { status: "LOGGED" };
  } else {
    try {
      const { data, error } = await api.emails.send({
        from: process.env.EMAIL_FROM?.trim() || "Çarşı <onboarding@resend.dev>",
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });
      result = error ? { status: "FAILED", error: error.message } : { status: "SENT", id: data?.id };
    } catch (error) {
      result = { status: "FAILED", error: error instanceof Error ? error.message : String(error) };
    }
    if (result.status === "FAILED") console.error(`[carsi][email:failed] to=${message.to} ${result.error}`);
  }
  try {
    await db.emailLog.create({
      data: {
        to: message.to,
        subject: message.subject,
        template: message.template,
        status: result.status,
        providerId: result.id ?? null,
        error: result.error ?? null,
      },
    });
  } catch (error) {
    console.error("[carsi] could not write EmailLog", error);
  }
  return result;
}
