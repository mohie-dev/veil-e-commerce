import { ItemType, Prisma } from '@prisma/client';

export const ORDER_INCLUDE = {
  items: true,
} satisfies Prisma.OrderInclude;

export type OrderWithItems = Prisma.OrderGetPayload<{
  include: typeof ORDER_INCLUDE;
}>;

export interface FormattedOrderItem extends Omit<
  OrderWithItems['items'][number],
  'unitPrice' | 'subtotal'
> {
  unitPrice: number;
  subtotal: number;
}

export interface FormattedOrder extends Omit<
  OrderWithItems,
  'subtotal' | 'deliveryFee' | 'total' | 'items'
> {
  subtotal: number;
  deliveryFee: number;
  total: number;
  items: FormattedOrderItem[];
}

export interface PreparedOrderItem {
  itemType: ItemType;
  itemName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  variantId: string | null;
  packageId: string | null;
}
