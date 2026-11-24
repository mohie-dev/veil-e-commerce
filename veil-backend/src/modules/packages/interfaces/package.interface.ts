import { Prisma } from '@prisma/client';

export const PACKAGE_INCLUDE = {
  items: {
    include: {
      variant: {
        select: {
          id: true,
          size: true,
          price: true,
          discountPrice: true,
          stock: true,
          isActive: true,
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              images: true,
              isActive: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.PackageInclude;

export type PackageWithItems = Prisma.PackageGetPayload<{
  include: typeof PACKAGE_INCLUDE;
}>;

export interface FormattedPackage extends Omit<
  PackageWithItems,
  'price' | 'discountPrice'
> {
  price: number;
  discountPrice: number | null;
  effectivePrice: number;
  hasActiveDiscount: boolean;
  availableStock: number;
  inStock: boolean;
}
