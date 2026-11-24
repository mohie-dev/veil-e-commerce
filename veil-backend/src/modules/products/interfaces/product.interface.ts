import { Prisma } from '@prisma/client';
import { FormattedVariant } from '../../variants/interfaces/variant.interface.js';

export const PRODUCT_INCLUDE = {
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  variants: {
    orderBy: {
      price: 'asc',
    },
  },
} satisfies Prisma.ProductInclude;

export type ProductWithRelations = Prisma.ProductGetPayload<{
  include: typeof PRODUCT_INCLUDE;
}>;

export interface FormattedProduct extends Omit<
  ProductWithRelations,
  'variants'
> {
  variants: FormattedVariant[];
  startingPrice: number;
  hasActiveDiscount: boolean;
  inStock: boolean;
}
