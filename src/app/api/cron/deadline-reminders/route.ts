import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { addPortalNotification, mutatePortal } from "@/lib/db";
import { escapeHtml } from "@/lib/mailer";
import { getSql } from "@/db";

function verifyCronAuth(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const authHeader = request.headers.get("authorization") || "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(authHeader, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await mutatePortal(async (db, ctx) => {
      const now = new Date();
      const todayPrefix = now.toISOString().slice(0, 10);
      const reminderCutoff = new Date(now);
      reminderCutoff.setDate(reminderCutoff.getDate() + 2);

      let remindersSent = 0;

      for (const task of db.tasks) {
        if (task.status !== "Assigned" || !task.deadline) continue;
        const deadline = new Date(task.deadline);
        if (
          Number.isNaN(deadline.getTime()) ||
          deadline < now ||
          deadline > reminderCutoff
        ) {
          continue;
        }

        const reminderTitle = `Deadline Reminder: ${task.title}`;
        const alreadySent = db.notifications.some(
          (notification) =>
            notification.title === reminderTitle &&
            notification.recipientInternRecordId === task.internRecordId &&
            notification.createdAt.slice(0, 10) === todayPrefix,
        );
        if (alreadySent) continue;

        const intern = db.interns.find(
          (item) => item.id === task.internRecordId,
        );
        if (!intern) continue;

        addPortalNotification(db, {
          recipientRole: "intern",
          recipientEmail: intern.email,
          recipientInternRecordId: intern.id,
          title: reminderTitle,
          message: `The task "${task.title}" is due on ${task.deadline}.`,
          category: "task",
        });

        ctx.outbox.push({
          to: intern.email,
          subject: `[Logix Portal] Deadline Reminder — ${task.title}`,
          heading: "Task Deadline Reminder",
          subHeading: `Due ${task.deadline}`,
          bodyText: `The task "${task.title}" is due on ${task.deadline}.`,
          bodyHtml: `<p>Your task <strong>${escapeHtml(task.title)}</strong> is due on <strong>${escapeHtml(task.deadline)}</strong>.</p>`,
        });
        remindersSent++;
      }

      return { remindersSent };
    });

    // Housekeeping: drop expired rate-limit windows (longest window is 1 hour).
    await getSql()`DELETE FROM portal_rate_limits WHERE window_start < now() - interval '1 day'`;

    return NextResponse.json(
      { success: true, ...result },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (err) {
    console.error("[CRON deadline-reminders ERROR]", err);
    return NextResponse.json(
      { error: "Failed to process deadline reminders." },
      { status: 500 },
    );
  }
}
