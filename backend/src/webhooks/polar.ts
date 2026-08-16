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
    const [row] = await db
      .select()
      .from(orders)
      .where(eq(orders.polarOrderId, polarOrderId))
      .limit(1);
    if (row?.status === "paid") return true;
  }
  if (checkoutId) {
    const [row] = await db
      .select()
      .from(orders)
      .where(eq(orders.polarCheckoutId, checkoutId))
      .limit(1);
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
    const [session] = await tx
      .select()
      .from(checkoutSessions)
      .where(eq(checkoutSessions.id, sessionId))
      .for("update");

    if (!session) return false;

    const [order] = await tx
      .insert(orders)
      .values({
        userId: session.userId,
        status: "paid",
        totalCents: session.totalCents,
        polarCheckoutId: checkoutId ?? session.polarCheckoutId ?? null,
        ...(polarOrderId ? { polarOrderId } : {}),
      })
      .returning();

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

  console.log("=== webhook received ===");

  try {
    if (!env.POLAR_WEBHOOK_SECRET) {
      res.status(503).send("Polar webhook secret not set");
      return;
    }

    // 1. دریافت بدنه خام به صورت string
    const rawBody =
      req.body instanceof Buffer ? req.body.toString("utf-8") : String(req.body);

    // 2. دریافت هدرها
    const id = headerString(req.headers, "webhook-id");
    const ts = headerString(req.headers, "webhook-timestamp");
    const sig = headerString(req.headers, "webhook-signature");

    console.log("headers:", { id, ts, sig: sig?.slice(0, 30) });
    console.log("raw body length:", rawBody.length);
    console.log("secret length:", env.POLAR_WEBHOOK_SECRET?.length);
    console.log("secret prefix:", env.POLAR_WEBHOOK_SECRET?.slice(0, 6));

    if (!id || !ts || !sig) {
      console.error("Missing webhook headers");
      res.status(400).json({ error: "Missing webhook headers" });
      return;
    }

    // 3. محاسبه دستی امضا
    const secretWithoutPrefix = env.POLAR_WEBHOOK_SECRET.trim().replace(/^whsec_/, '');
    const signedPayload = `${id}.${ts}.${rawBody}`;
    const expectedSignature = crypto
      .createHmac("sha256", Buffer.from(secretWithoutPrefix, "base64"))
      .update(signedPayload)
      .digest("base64");

    console.log("expected signature:", expectedSignature);
    console.log("received signature:", sig);

    // 4. مقایسه امضا
    const receivedSigPart = sig.startsWith("v1,") ? sig.slice(3) : sig;
    if (expectedSignature !== receivedSigPart) {
      console.error("Signature mismatch");
      res.status(400).json({ error: "Invalid signature" });
      return;
    }

    // 5. پردازش رویداد
    const event = JSON.parse(rawBody) as {
      type: string;
      data?: Record<string, unknown>;
    };

    console.log("event.type:", event.type);
    console.log("event.data.metadata:", event.data?.metadata);
    console.log("event.data.checkout_id:", event.data?.checkout_id);

    // 6. هندل order.paid
    if (event.type === "order.paid" && event.data) {
      const data = event.data;
      const polarOrderId = typeof data.id === "string" ? data.id : undefined;
      const checkoutId = typeof data.checkout_id === "string" ? data.checkout_id : undefined;

      if (await alreadyPaid(polarOrderId, checkoutId)) {
        console.log("duplicate order.paid, skipping");
        res.json({ ok: true, duplicate: true });
        return;
      }

      let sessionId = checkoutSessionIdFromMetadata(data);

      if (!sessionId && checkoutId) {
        const [session] = await db
          .select({ id: checkoutSessions.id })
          .from(checkoutSessions)
          .where(eq(checkoutSessions.polarCheckoutId, checkoutId))
          .limit(1);
        sessionId = session?.id;
      }

      if (!sessionId) {
        console.error("order.paid: checkout session not found", {
          checkoutId,
          metadata: data.metadata,
        });
        res.status(500).json({ error: "checkout session not found" });
        return;
      }

      const ok = await fulfillCheckoutSession(sessionId, polarOrderId, checkoutId);
      if (ok) {
        console.log("order.paid: fulfillment successful", sessionId);
        res.json({ ok: true });
        return;
      }

      if (await alreadyPaid(polarOrderId, checkoutId)) {
        console.log("order.paid: already paid after transaction");
        res.json({ ok: true, duplicate: true });
        return;
      }

      console.error("order.paid: could not fulfill checkout session");
      res.status(500).json({ error: "Checkout fulfillment failed" });
      return;
    }

    // 7. هندل checkout.updated succeeded (اختیاری)
    if (
      event.type === "checkout.updated" &&
      event.data &&
      event.data.status === "succeeded"
    ) {
      // مشابه order.paid
      // ...
      res.json({ ok: true });
      return;
    }

    // سایر رویدادها
    res.json({ ok: true });
  } catch (error) {
    console.error("polar webhook error", error);
    res.status(400).json({ error: "Invalid webhook" });
  }
}