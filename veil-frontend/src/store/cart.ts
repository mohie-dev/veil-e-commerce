import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartLine, ItemType } from '../types';

interface CartState {
  items: CartLine[];
  migrationNotice: boolean;
  addItem: (item: Omit<CartLine, 'quantity'>, quantity?: number) => void;
  setQuantity: (itemType: ItemType, itemId: string, quantity: number) => void;
  removeItem: (itemType: ItemType, itemId: string) => void;
  clear: () => void;
  clearMigrationNotice: () => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function migrateCartState(value: unknown): Pick<CartState, 'items' | 'migrationNotice'> {
  if (!isRecord(value) || !Array.isArray(value.items)) return { items: [], migrationNotice: false };
  let removedLegacyProducts = false;
  const items = value.items.flatMap((entry): CartLine[] => {
    if (!isRecord(entry) || (entry.itemType !== 'PRODUCT' && entry.itemType !== 'PACKAGE')) return [];
    if (
      typeof entry.itemId !== 'string' ||
      typeof entry.name !== 'string' ||
      typeof entry.image !== 'string' ||
      typeof entry.price !== 'number' ||
      typeof entry.quantity !== 'number'
    ) return [];

    if (entry.itemType === 'PRODUCT' && typeof entry.size !== 'string') {
      removedLegacyProducts = true;
      return [];
    }

    const maxStock = typeof entry.maxStock === 'number' ? entry.maxStock : entry.stock;
    if (typeof maxStock !== 'number') return [];
    return [{
      itemType: entry.itemType,
      itemId: entry.itemId,
      quantity: entry.quantity,
      name: entry.name,
      slug: typeof entry.slug === 'string' ? entry.slug : undefined,
      size: typeof entry.size === 'string' ? entry.size : undefined,
      image: entry.image,
      price: entry.price,
      maxStock,
    }];
  });
  return { items, migrationNotice: removedLegacyProducts };
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      migrationNotice: false,
      addItem: (item, quantity = 1) =>
        set((state) => {
          const found = state.items.find((line) => line.itemType === item.itemType && line.itemId === item.itemId);
          if (found) {
            return {
              items: state.items.map((line) =>
                line === found
                  ? { ...line, quantity: Math.min(line.quantity + quantity, line.maxStock) }
                  : line,
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: Math.min(quantity, item.maxStock) }] };
        }),
      setQuantity: (itemType, itemId, quantity) =>
        set((state) => ({
          items: state.items
            .map((item) =>
              item.itemType === itemType && item.itemId === itemId
                ? { ...item, quantity: Math.min(Math.max(1, quantity), item.maxStock) }
                : item,
            )
            .filter((item) => item.quantity > 0),
        })),
      removeItem: (itemType, itemId) =>
        set((state) => ({
          items: state.items.filter((item) => item.itemType !== itemType || item.itemId !== itemId),
        })),
      clear: () => set({ items: [] }),
      clearMigrationNotice: () => set({ migrationNotice: false }),
    }),
    {
      name: 'veil-cart',
      version: 2,
      migrate: (persistedState) => migrateCartState(persistedState) as CartState,
    },
  ),
);
