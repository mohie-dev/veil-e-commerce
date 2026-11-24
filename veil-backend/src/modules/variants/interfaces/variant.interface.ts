import { ProductVariant } from '@prisma/client';

export interface FormattedVariant extends Omit<
  ProductVariant,
  'price' | 'discountPrice'
> {
  price: number;
  discountPrice: number | null;
  effectivePrice: number;
  hasActiveDiscount: boolean;
  inStock: boolean;
}
