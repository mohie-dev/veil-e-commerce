import { PartialType } from '@nestjs/swagger';
import { UpsertCustomerDto } from './upsert-customer.dto.js';

export class UpdateCustomerDto extends PartialType(UpsertCustomerDto) {}
