// import type { Request, Response } from "express";
// import { getEnv } from "../lib/env.js";
// import { checkoutSessions, orderItems, orders } from "../db/schema.js";
// import { eq } from "drizzle-orm";
// import { db } from "../db/index.js";
// import { Webhook } from "standardwebhooks";


// function headerString(headers: Request["headers"], name: string) {
//     const value = headers[name];
//     return Array.isArray(value) ? value[0] : value;
// };


// function checkoutSessionIdFromMetadata(order: Record<string, unknown>) {
//     const metadata = order.metadata;
//     if (!metadata || typeof metadata !== "object") return undefined;
//     const sessionId = (metadata as Record<string, unknown>).checkout_session_id;
//     return typeof sessionId === "string" ? sessionId : undefined;
// }


// async function alreadyPaid(polarOrderId?: string, checkoutId?: string) {
//     if (polarOrderId) {
//         const [row] = await db.select().from(orders).where(eq(orders.polarOrderId, polarOrderId)).limit(1);
//         if (row?.status === "paid") return true;
//     }
//     if (checkoutId) {
//         const [row] = await db.select().from(orders).where(eq(orders.polarCheckoutId, checkoutId)).limit(1);
//         if (row?.status === "paid") return true;
//     }
//     return false;
// };


// async function fulfillCheckoutSession(sessionId: string, polarOrderId: string | undefined, checkoutId: string | undefined) {
//     return await db.transaction(async (tx) => {
//         const [session] = await tx.select().from(checkoutSessions).where(eq(checkoutSessions.id, sessionId)).for("update");
//         if (!session) return false;

//         const [order] = await tx.insert(orders).values({
//             userId: session.userId,
//             status: "paid",
//             totalCents: session.totalCents,
//             polarCheckoutId: checkoutId ?? session.polarCheckoutId ?? null,
//             ...(polarOrderId ? { polarOrderId } : {}),
//         })
//             .returning();

//         if (session.lines.length) {
//             await tx.insert(orderItems).values(
//                 session.lines.map((line) => ({
//                     orderId: order.id,
//                     productId: line.productId,
//                     quantity: line.quantity,
//                     unitPriceCents: line.unitPriceCents,
//                 })),
//             );
//         }

//         await tx.delete(checkoutSessions).where(eq(checkoutSessions.id, sessionId));
//         return true;

//     })
// }


// export async function polarWebhookHandler(req: Request, res: Response) {
//     const env = getEnv();

//     console.log("=== webhook received ===");
//     console.log("path:", req.path);
//     console.log("headers:", req.headers);
//     console.log("raw body length:", req.body instanceof Buffer ? req.body.length : "not buffer");
//     console.log("raw body snippet:", req.body instanceof Buffer ? req.body.toString("utf-8").slice(0, 200) : String(req.body).slice(0, 200));

//     try {
//         if (!env.POLAR_WEBHOOK_SECRET) {
//             res.status(503).send("Polar webhook secret not set");
//             return;
//         }

//         const raw = req.body instanceof Buffer ? req.body : Buffer.from(String(req.body));
//         // const wh = new Webhook(Buffer.from(env.POLAR_WEBHOOK_SECRET, 'utf-8').toString("base64"));
//         const wh = new Webhook(env.POLAR_WEBHOOK_SECRET);


//         const id = headerString(req.headers, "webhook-id");
//         const ts = headerString(req.headers, "webhook-timestamp");
//         const sig = headerString(req.headers, "webhook-signature");

//         if (!id || !ts || !sig) {
//             res.status(400).json({ error: "Missing webhook headers" });
//             return;
//         }

//         wh.verify(raw, { "webhook-id": id, "webhook-timestamp": ts, "webhook-signature": sig });

//         const event = JSON.parse(raw.toString("utf-8")) as {
//             type: string;
//             data?: Record<string, unknown>;
//         };

//         if (event.type === "order.paid" && event.data) {
//             const data = event.data;
//             const polarOrderId = typeof data.id === "string" ? data.id : undefined;
//             const checkoutId = typeof data.checkout_id === "string" ? data.checkout_id : undefined;

//             if (await alreadyPaid(polarOrderId, checkoutId)) {
//                 res.json({ ok: true, duplicate: true });
//                 return;
//             }

//             const sessionId = checkoutSessionIdFromMetadata(data);
//             console.log(sessionId);

//             if (sessionId) {
//                 const ok = await fulfillCheckoutSession(sessionId, polarOrderId, checkoutId);

//                 if (ok) {
//                     res.json({ ok: true, duplicate: true });
//                     return;
//                 }

//                 if (await alreadyPaid(polarOrderId, checkoutId)) {
//                     res.json({ ok: true, duplicate: true });
//                     return;
//                 }

//                 console.error("polar order.paid: could not fulfill checkouut session", {
//                     sessionId, checkoutId
//                 });

//                 res.status(500).json({ error: "Checkout fulfillment failed" });
//             }
//         }
//         const event1 = JSON.parse(raw.toString("utf-8"));
//         console.log("event.type:", event1.type);
//         console.log("event.data.metadata:", event1.data?.metadata);
//         console.log("checkout_id:", event1.data?.checkout_id);

//         res.json({ ok: true });

//     } catch (error) {
//         console.error("polar webhook error", error);
//         res.status(400).json({ error: "Invalid webhook" });
//     }
// }

import type { Request, Response } from "express";
import { getEnv } from "../lib/env.js";
import { checkoutSessions, orderItems, orders } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { Webhook } from "standardwebhooks";

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

    // مهم‌ترین تغییر:
    // 1. حذف فاصله/خط جدید اضافی
    // 2. حذف پیشوند whsec_ برای کتابخانه standardwebhooks
    const secret = env.POLAR_WEBHOOK_SECRET.trim().replace(/^whsec_/, "");

    console.log("secret length after trim/strip:", secret.length);
    console.log("secret prefix after trim/strip:", secret.slice(0, 6));

    const rawBody =
      req.body instanceof Buffer
        ? req.body.toString("utf-8")
        : String(req.body);

    console.log("raw body first 100 chars:", rawBody.slice(0, 100));

    const wh = new Webhook(secret);

    const id = headerString(req.headers, "webhook-id");
    const ts = headerString(req.headers, "webhook-timestamp");
    const sig = headerString(req.headers, "webhook-signature");

    console.log("headers:", { id, ts, sig: sig?.slice(0, 20) });

    if (!id || !ts || !sig) {
      console.error("Missing webhook headers", { id, ts, sig });
      res.status(400).json({ error: "Missing webhook headers" });
      return;
    }

    wh.verify(rawBody, {
      "webhook-id": id,
      "webhook-timestamp": ts,
      "webhook-signature": sig,
    });

    const event = JSON.parse(rawBody) as {
      type: string;
      data?: Record<string, unknown>;
    };

    console.log("event.type:", event.type);
    console.log("event.data.metadata:", event.data?.metadata);
    console.log("event.data.checkout_id:", event.data?.checkout_id);

    // 1) order.paid
    if (event.type === "order.paid" && event.data) {
      const data = event.data;
      const polarOrderId = typeof data.id === "string" ? data.id : undefined;
      const checkoutId =
        typeof data.checkout_id === "string" ? data.checkout_id : undefined;

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
          polarOrderId,
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

      console.error("order.paid: could not fulfill checkout session", {
        sessionId,
        checkoutId,
      });

      res.status(500).json({ error: "Checkout fulfillment failed" });
      return;
    }

    // 2) checkout.updated succeeded
    if (
      event.type === "checkout.updated" &&
      event.data &&
      event.data.status === "succeeded"
    ) {
      const data = event.data as {
        id: string;
        metadata?: Record<string, unknown>;
      };

      const checkoutId = data.id;

      if (await alreadyPaid(undefined, checkoutId)) {
        console.log("duplicate checkout.updated, skipping");
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
        console.error("checkout.updated: checkout session not found", {
          checkoutId,
          metadata: data.metadata,
        });

        res.status(500).json({ error: "checkout session not found" });
        return;
      }

      const ok = await fulfillCheckoutSession(sessionId, undefined, checkoutId);

      if (ok) {
        console.log("checkout.updated: fulfillment successful", sessionId);
        res.json({ ok: true });
        return;
      }

      if (await alreadyPaid(undefined, checkoutId)) {
        console.log("checkout.updated: already paid after transaction");
        res.json({ ok: true, duplicate: true });
        return;
      }

      console.error("checkout.updated: could not fulfill checkout session", {
        sessionId,
        checkoutId,
      });

      res.status(500).json({ error: "Checkout fulfillment failed" });
      return;
    }

    // سایر رویدادها
    res.json({ ok: true });
  } catch (error) {
    console.error("polar webhook error", error);
    res.status(400).json({ error: "Invalid webhook" });
  }
}