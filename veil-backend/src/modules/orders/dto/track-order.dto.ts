import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class TrackOrderDto {
  @ApiProperty({ example: 'VEIL-482910' })
  @IsString()
  @IsNotEmpty()
  orderNumber: string;

  @ApiProperty({ example: '01012345678' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(\+20|20|0)?1[0125][0-9]{8}$/, {
    message: 'Please provide a valid Egyptian mobile number',
  })
  phone: string;
}
