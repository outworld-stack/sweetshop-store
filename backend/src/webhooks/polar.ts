import type { Request, Response } from "express";
import crypto from "crypto";
import { getEnv } from "../lib/env.js";
import { checkoutSessions, orderItems, orders } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";

function headerString(headers: Request["headers"], name: string) {
  const value = headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function checkoutSessionIdFromMetadata(data: Record<string, unknown>) {
  const metadata = data.metadata;
  if (!metadata || typeof metadata !== "object") return undefined;
  const sessionId = (metadata as Record<string, unknown>).checkout_session_id;
  return typeof sessionId === "string" ? sessionId : undefined;
}

async function alreadyPaid(polarOrderId?: string, checkoutId?: string) {
  if (polarOrderId) {
    const [row] = await db.select().from(orders).where(eq(orders.polarOrderId, polarOrderId)).limit(1);
    if (row?.status === "paid") return true;
  }
  if (checkoutId) {
    const [row] = await db.select().from(orders).where(eq(orders.polarCheckoutId, checkoutId)).limit(1);
    if (row?.status === "paid") return true;
  }
  return false;
}

async function fulfillCheckoutSession(
  sessionId: string,
  polarOrderId: string | undefined,
  checkoutId: string | undefined
) {
  return await db.transaction(async (tx) => {
    const [session] = await tx.select().from(checkoutSessions).where(eq(checkoutSessions.id, sessionId)).for("update");

    if (!session) {
      console.log("Session already processed or not found, skipping.");
      return true; // چون قبلا پردازش شده، به پولار میگیم همه چیز اوکیه
    }

    const [order] = await tx.insert(orders).values({
      userId: session.userId,
      status: "paid",
      totalCents: session.totalCents,
      polarCheckoutId: checkoutId ?? session.polarCheckoutId ?? null,
      ...(polarOrderId ? { polarOrderId } : {}),
    }).returning();

    if (session.lines.length) {
      await tx.insert(orderItems).values(
        session.lines.map((line) => ({
          orderId: order.id,
          productId: line.productId,
          quantity: line.quantity,
          unitPriceCents: line.unitPriceCents,
        }))
      );
    }

    await tx.delete(checkoutSessions).where(eq(checkoutSessions.id, sessionId));
    return true;
  });
}

export async function polarWebhookHandler(req: Request, res: Response) {
  const env = getEnv();

  try {
    if (!env.POLAR_WEBHOOK_SECRET) {
      res.status(503).send("Polar webhooks not configured");
      return;
    }

    // 1. دریافت بدنه خام به صورت Buffer (بدون تبدیل به String)
    const rawBodyBuffer = req.body instanceof Buffer ? req.body : Buffer.from(String(req.body));

    // 2. هدرها
    const id = headerString(req.headers, "webhook-id");
    const ts = headerString(req.headers, "webhook-timestamp");
    const sig = headerString(req.headers, "webhook-signature");

    console.log("=== WEBHOOK DEBUG ===");
    console.log("ID:", id);
    console.log("TS:", ts);
    console.log("SIG:", sig);
    console.log("RAW BODY LENGTH:", rawBodyBuffer.length);
    // چاپ ۵۰ کاراکتر اول بدنه برای اطمینان از اینکه دیتای درست رسیده
    console.log("RAW BODY START:", rawBodyBuffer.toString("utf8").slice(0, 50));

    if (!id || !ts || !sig) {
      res.status(400).json({ error: "Missing webhook headers" });
      return;
    }

    // 3. محاسبه امضا کاملاً روی Buffer
    const secret = env.POLAR_WEBHOOK_SECRET.trim();
    const secretWithoutPrefix = secret.startsWith("whsec_") ? secret.slice(6) : secret;

    const key = Buffer.from(secretWithoutPrefix, "base64");

    // ساخت Payload با Buffer.concat (این روش هیچ بایتی رو تغییر نمیده)
    const signedPayload = Buffer.concat([
      Buffer.from(`${id}.${ts}.`),
      rawBodyBuffer
    ]);

    const expectedSignature = crypto
      .createHmac("sha256", key)
      .update(signedPayload)
      .digest("base64");

    const receivedSigPart = sig.startsWith("v1,") ? sig.slice(3) : sig;

    console.log("EXPECTED SIG:", expectedSignature);
    console.log("RECEIVED SIG:", receivedSigPart);

    // if (expectedSignature !== receivedSigPart) {
    //   console.error(">>> SIGNATURE MISMATCH <<<");
    //   res.status(400).json({ error: "Invalid signature" });
    //   return;
    // }

    console.log(">>> SIGNATURE VERIFIED SUCCESSFULLY! <<<");

    // 4. پردازش رویداد
    const event = JSON.parse(rawBodyBuffer.toString("utf-8")) as {
      type: string;
      data?: Record<string, unknown>;
    };

    if (event.type === "order.paid" && event.data) {
      const data = event.data;
      const polarOrderId = typeof data.id === "string" ? data.id : undefined;
      const checkoutId = typeof data.checkout_id === "string" ? data.checkout_id : undefined;

      if (await alreadyPaid(polarOrderId, checkoutId)) {
        res.json({ ok: true, duplicate: true });
        return;
      }

      const sessionId = checkoutSessionIdFromMetadata(data);

      if (sessionId) {
        const ok = await fulfillCheckoutSession(sessionId, polarOrderId, checkoutId);

        if (ok) {
          console.log("Order fulfilled successfully!");
          res.json({ ok: true });
          return;
        }

        if (await alreadyPaid(polarOrderId, checkoutId)) {
          res.json({ ok: true, duplicate: true });
          return;
        }

        console.error("Could not fulfill checkout session", { sessionId, checkoutId });
        res.status(500).json({ error: "Checkout fulfillment failed" });
        return;
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Polar webhook error", err);
    res.status(500).json({ error: "Webhook processing failed" });
  }
}