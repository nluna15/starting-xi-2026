"use server";

import { Resend } from "resend";
import { z } from "zod";
import { FEEDBACK_MAX_LENGTH, FEEDBACK_SUBJECT_MAX_LENGTH } from "./constants";

const FeedbackSchema = z.object({
  subject: z.string().trim().min(1, "Subject is required.").max(FEEDBACK_SUBJECT_MAX_LENGTH),
  message: z.string().trim().min(1, "Message is required.").max(FEEDBACK_MAX_LENGTH),
});

export type FeedbackInput = z.infer<typeof FeedbackSchema>;

export type FeedbackResult = { ok: true } | { ok: false; error: string };

export async function sendFeedbackAction(input: FeedbackInput): Promise<FeedbackResult> {
  const parsed = FeedbackSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.FEEDBACK_TO_EMAIL;
  const from = process.env.FEEDBACK_FROM_EMAIL ?? "onboarding@resend.dev";

  if (!apiKey || !to) {
    return { ok: false, error: "Feedback delivery is not configured." };
  }

  const { subject, message } = parsed.data;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to,
      subject: `[Feedback] ${subject}`,
      text: message,
    });
    if (error) {
      return { ok: false, error: "Could not send feedback. Please try again later." };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not send feedback. Please try again later." };
  }
}
