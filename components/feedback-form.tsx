"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { sendFeedbackAction } from "@/app/feedback/actions";
import {
  FEEDBACK_MAX_LENGTH,
  FEEDBACK_SUBJECT_MAX_LENGTH,
} from "@/app/feedback/constants";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "ok" }
  | { kind: "error"; message: string };

export function FeedbackForm() {
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [status, setStatus] = React.useState<Status>({ kind: "idle" });

  const remaining = FEEDBACK_MAX_LENGTH - message.length;
  const overLimit = remaining < 0;
  const canSend =
    subject.trim().length > 0 &&
    message.trim().length > 0 &&
    !overLimit &&
    status.kind !== "sending";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSend) return;
    setStatus({ kind: "sending" });
    const result = await sendFeedbackAction({ subject, message });
    if (result.ok) {
      setStatus({ kind: "ok" });
      setSubject("");
      setMessage("");
    } else {
      setStatus({ kind: "error", message: result.error });
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <label
          htmlFor="feedback-subject"
          className="cond text-[12px] tracking-[0.08em] text-ink-2"
        >
          Subject
        </label>
        <input
          id="feedback-subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={status.kind === "sending"}
          maxLength={FEEDBACK_SUBJECT_MAX_LENGTH}
          required
          placeholder="What's this about?"
          className={cn(
            "w-full rounded-md border border-line bg-bg px-3.5 py-2.5 text-[14px] text-ink placeholder:text-ink-faint",
            "transition-[border-color,box-shadow] duration-150 ease-in-out",
            "hover:border-line-strong",
            "focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]",
            "disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-mute",
          )}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label
            htmlFor="feedback-message"
            className="cond text-[12px] tracking-[0.08em] text-ink-2"
          >
            Message
          </label>
          <span
            className={cn(
              "mono text-[11px] tracking-[0.08em]",
              overLimit ? "text-accent" : "text-ink-faint",
            )}
          >
            {message.length} / {FEEDBACK_MAX_LENGTH}
          </span>
        </div>
        <textarea
          id="feedback-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={status.kind === "sending"}
          maxLength={FEEDBACK_MAX_LENGTH}
          rows={6}
          required
          placeholder="Tell us what's on your mind."
          className={cn(
            "w-full resize-y rounded-md border border-line bg-bg px-3.5 py-3 text-[14px] leading-[1.45] text-ink placeholder:text-ink-faint",
            "transition-[border-color,box-shadow] duration-150 ease-in-out",
            "hover:border-line-strong",
            "focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]",
            "disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-mute",
          )}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="text-[12px] leading-[1.45]" aria-live="polite">
          {status.kind === "ok" && (
            <span className="text-success">Thanks — your feedback was sent.</span>
          )}
          {status.kind === "error" && (
            <span className="text-accent-deep">{status.message}</span>
          )}
        </div>
        <Button type="submit" variant="primary" size="md" disabled={!canSend}>
          {status.kind === "sending" ? "Sending…" : "Send"}
        </Button>
      </div>
    </form>
  );
}
