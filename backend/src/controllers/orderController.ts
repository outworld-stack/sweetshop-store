import { getAuth } from "@clerk/express";
import { Request, Response, NextFunction } from "express";
import { getLocalUser } from "../lib/users";
import { isStaff } from "../lib/roles";
import { db } from "../db";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { orderItems, orders, products, users } from "../db/schema";
import { getEnv } from "../lib/env";
import { getStreamChatServer, streamChatDisplayName, streamUserId } from "../lib/stream";


const env = getEnv();

export async function listorders(req: Request, res: Response, next: NextFunction) {
    try {
        const { userId, isAuthenticated } = getAuth(req);
        if (!isAuthenticated) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        };
        const localUser = await getLocalUser(userId);
        if (!localUser) {
            res.status(503).json({ message: "Account not synced yet" });
            return;
        };

        const rows = isStaff(localUser.role) ? await db.select().from(orders).orderBy(desc(orders.createdAt)) : await db.select().from(orders).where(eq(orders.userId, localUser.id)).orderBy(desc(orders.createdAt));

        const orderIds = rows.map((row) => row.id);
        const previewByOrder = new Map();

        if (orderIds.length > 0) {
            const itemRows = await db.select({
                orderId: orderItems.orderId,
                quantity: orderItems.quantity,
                name: products.name,
                slug: products.slug,
                imageUrl: products.imageUrl,
            })
                .from(orderItems)
                .innerJoin(products, eq(orderItems.productId, products.id))
                .where(inArray(orderItems.orderId, orderIds))
                .orderBy(asc(orderItems.orderId));

            for (const row of itemRows) {
                const list = previewByOrder.get(row.orderId) ?? [];
                list.push({
                    quantity: row.quantity,
                    name: row.name,
                    slug: row.slug,
                    imageUrl: row.imageUrl,
                });
                previewByOrder.set(row.orderId, list);
            }

        };

        const ordersPayload = rows.map((row) => ({
            ...row,
            previewItems: previewByOrder.get(row.id) ?? [],
        }));

        res.status(200).json({ orders: ordersPayload });

    } catch (error) {
        next(error);
    }
};


export async function getOrder(req: Request, res: Response, next: NextFunction) {
    try {
        const { userId, isAuthenticated } = getAuth(req);
        if (!isAuthenticated || !userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        };
        const localUser = await getLocalUser(userId);
        if (!localUser) {
            res.status(503).json({ message: "Account not synced yet" });
            return;
        };

        const [order] = await db.select().from(orders).where(eq(orders.id, req.params.id as string)).limit(1);

        if (!order) {
            res.status(404).json({ error: "Order not found" });
            return;
        };

        const canAccess = order.userId === localUser.id || isStaff(localUser.role);
        if (!canAccess) {
            res.status(404).json({ error: "not found" });
            return;
        };

        const items = await db.select({
            id: orderItems.id,
            quantity: orderItems.quantity,
            product: products,
            unitPriceCents: orderItems.unitPriceCents,
        })
            .from(orderItems)
            .innerJoin(products, eq(orderItems.productId, products.id))
            .where(eq(orderItems.orderId, order.id));


        res.status(200).json({ order, items });

    } catch (error) {
        next(200);
    }
};

export async function createStreamChannel(req: Request, res: Response, next: NextFunction) {
    try {
        const { userId, isAuthenticated } = getAuth(req);
        if (!isAuthenticated || !userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        };

        const server = getStreamChatServer(env);

        const localUser = await getLocalUser(userId);
        if (!localUser) {
            res.status(503).json({ message: "Account not synced yet" });
            return;
        };

        const [order] = await db.select().from(orders).where(eq(orders.id, req.params.id as string)).limit(1);

        if (!order) {
            res.status(404).json({ error: "Order Not Found" });
            return;
        };

        const isOwner = order.userId === localUser.id;
        if (!isOwner && !isStaff(localUser.role)) {
            res.status(404).json({ error: "Not Found" });
            return;
        };

        if (order.status !== "paid") {
            res.status(403).json({ error: "Order Not Paid" });
            return;
        };

        const streamChatUserId = streamUserId(userId);

        await server.upsertUser({
            id: streamChatUserId,
            name: streamChatDisplayName(localUser.role, localUser.displayName, localUser.email),
        });

        const channel = server.channel("messaging", `order-${order.id}`, {
            name: `Support . order ${order.id.slice(0.8)}`,
            created_by_id: streamChatUserId,
        });

        await channel.create();

        await channel.addMembers([streamChatUserId]);

        res.json({ channelType: "messaging", channelId: `order-${order.id}`, streamUserId: streamChatUserId });

    } catch (error) {
        next(error);
    }
};


export async function createVideoInvite(req: Request, res: Response, next: NextFunction) {
    try {
        const { userId, isAuthenticated } = getAuth(req);
        if (!isAuthenticated || !userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        };

        const server = getStreamChatServer(env);

        const localUser = await getLocalUser(userId);
        if (!localUser) {
            res.status(503).json({ message: "Account not synced yet" });
            return;
        };

        if (!isStaff(localUser.role)) {
            res.status(403).json({ message: "Forbidden, Only Admin Can Send Video Invites" });
            return;
        };

        const [order] = await db.select().from(orders).where(eq(orders.id, req.params.id as string)).limit(1);

        if (!order || order.status !== "paid") {
            res.status(404).json({ error: "Order Not Found Or Not Paid" });
            return;
        };

        if (!order.userId) {
            res.status(400).json({ error: "Order has no associated user" });
            return;
        };

        const [owner] = await db.select().from(users).where(eq(users.id, order.userId )).limit(1);

        const customerSid = streamUserId(owner.clerkUserId);
        await server.upsertUser({
            id: customerSid,
            name: owner.displayName ?? owner.email ?? "Customer",
        });

        const staffStreamUSerId = streamUserId(userId);

        await server.upsertUser({
            id: staffStreamUSerId,
            name: streamChatDisplayName(localUser.role, localUser.displayName, localUser.email),
        });

        const channel = server.channel("messaging", `order-${order.id}`, {
            name: `Support . order ${order.id.slice(0.8)}`,
            created_by_id: customerSid,
        });

        await channel.create();
        await channel.addMembers([customerSid, staffStreamUSerId]);

        const joinUrl = `${env.FRONTEND_URL.replace(/\/+$/, "")}/orders/${order.id}/call`;

        await channel.sendMessage({
            text: `Video Call - tap link to join : ${joinUrl}`,
            user_id: staffStreamUSerId,
            custom: {
                video_invite: true,
                join_url: joinUrl,
            },
        });

        res.json({ ok: true, joinUrl });

    } catch (error) {
        next(error);
    }
};

