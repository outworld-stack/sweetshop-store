import { create } from "zustand";
import { persist } from "zustand/middleware";


export const useCart = create(persist((set, get) => ({
    items: [],

    addItem(productId, qty = 1) {
        const items = [...get().items];
        const i = items.findIndex((item) => item.productId === productId);
        if (i >= 0) {
            items[i] = { ...items[i], quantity: items[i].quantity + qty };
        } else {
            items.push({ productId, quantity: qty });
        }
        set({ items });
    },


    removeItem(productId) { set((state) => ({ items: state.items.filter((item) => item.productId !== productId) })) },

    clearCart() {
        set({ items: [] })
    },

    setQty(productId, quantity) {
        if (quantity <= 0) {
            set((state) => ({ items: state.items.filter((item) => item.productId !== productId) }));
            return;
        }
        const items = get().items.map((item) =>
            item.productId === productId ? { ...item, quantity } : item
        );
        set({ items });
    },
}),
    {
        name: "sweetshop-storage",
    },
));