import type { Request, Response, NextFunction } from 'express';
import { getEnv } from '../lib/env';
import z from 'zod';
import { getLocalUser } from '../lib/users';
import { getAuth } from '@clerk/express';
import { db } from '../db';
import { inArray, and, eq } from 'drizzle-orm';
import { CheckoutSessionLine, checkoutSessions, products } from '../db/schema';
import { polarCreateCheckout } from '../lib/polar';

const env = getEnv();


const cartSchema = z.object({
    items: z
        .array(
            z.object({
                productId: z.string().uuid(),
                quantity: z.number().int().positive(),
            })
        )
        .min(1),
})

export async function createCheckout(req: Request, res: Response, next: NextFunction) {
    try {
        const { userId, isAuthenticated } = getAuth(req);
        if (!isAuthenticated) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const parsed = cartSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: 'Invalid cart', details: parsed.error.flatten() });
            return;
        }

        if (!env.POLAR_ACCESS_TOKEN) {
            res.status(503).json({ error: 'Payments are currently unavailable' });
            return;
        }

        const localUser = await getLocalUser(userId);
        if (!localUser) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const ids = parsed.data.items.map(item => item.productId);

        const prodRows = await db
            .select()
            .from(products)
            .where(and(inArray(products.id, ids), eq(products.active, true)));

        if (prodRows.length !== ids.length) {
            res.status(400).json({ error: 'Invalid cart' });
            return;
        }

        const byId = new Map(prodRows.map(row => [row.id, row]));
        let totalCents = 0;

        const lines: CheckoutSessionLine[] = [];

        for (const line of parsed.data.items) {
            const product = byId.get(line.productId);
            if (!product) {
                res.status(400).json({ error: 'Invalid cart' });
                return;
            }

            totalCents += product.priceCents * line.quantity;
            lines.push({
                productId: product.id,
                quantity: line.quantity,
                unitPriceCents: product.priceCents,
            });

            if (totalCents < 10) {
                res.status(400).json({ error: 'Total amount must be at least $0.10' });
                return;
            }
        }

        const [session] = await db
            .insert(checkoutSessions)
            .values({
                userId: localUser.id,
                lines,
                totalCents,
                currency: "usd",
            })
            .returning();

        const successUrl = `${env.FRONTEND_URL}/checkout/return?checkout_id={CHECKOUT_ID}`;
        const returnUrl = `${env.FRONTEND_URL}/cart`;

        const checkout = await polarCreateCheckout(env, {
            products: [env.POLAR_CHECKOUT_PRODUCT_ID],
            prices: {
                [env.POLAR_CHECKOUT_PRODUCT_ID]: [
                    {
                        amount_type: "fixed",
                        price_currency: "usd",
                        price_amount: totalCents
                    }
                ]
            },
            success_url: successUrl,
            return_url: returnUrl,
            external_customer_id: userId,
            metadata: { checkout_session_id: session.id }
        });

        await db.update(checkoutSessions).set({ polarCheckoutId: checkout.id }).where(eq(checkoutSessions.id, session.id));

        res.json({ checkoutUrl: checkout.url });

    } catch (error) {
        next(error);
    }
};