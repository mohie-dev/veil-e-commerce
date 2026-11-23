import { StoreSettings } from '@prisma/client';

export interface FormattedStoreSettings extends Omit<
  StoreSettings,
  'defaultDeliveryFee' | 'freeShippingThreshold'
> {
  defaultDeliveryFee: number;
  freeShippingThreshold: number | null;
}
