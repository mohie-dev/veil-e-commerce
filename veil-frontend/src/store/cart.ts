import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartLine, ItemType } from '../types';

interface CartState {
  items: CartLine[];
  addItem: (item: Omit<CartLine, 'quantity'>, quantity?: number) => void;
  setQuantity: (itemType: ItemType, itemId: string, quantity: number) => void;
  removeItem: (itemType: ItemType, itemId: string) => void;
  clear: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item, quantity = 1) =>
        set((state) => {
          const found = state.items.find((line) => line.itemType === item.itemType && line.itemId === item.itemId);
          if (found) {
            return {
              items: state.items.map((line) =>
                line === found
                  ? { ...line, quantity: Math.min(line.quantity + quantity, line.stock) }
                  : line,
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: Math.min(quantity, item.stock) }] };
        }),
      setQuantity: (itemType, itemId, quantity) =>
        set((state) => ({
          items: state.items
            .map((item) =>
              item.itemType === itemType && item.itemId === itemId
                ? { ...item, quantity: Math.min(Math.max(1, quantity), item.stock) }
                : item,
            )
            .filter((item) => item.quantity > 0),
        })),
      removeItem: (itemType, itemId) =>
        set((state) => ({
          items: state.items.filter((item) => item.itemType !== itemType || item.itemId !== itemId),
        })),
      clear: () => set({ items: [] }),
    }),
    { name: 'veil-cart' },
  ),
);
