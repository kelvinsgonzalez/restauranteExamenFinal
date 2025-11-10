import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { ReservationStatus } from '../../../common/enums/reservation-status.enum';

export class CreateReservationDto {
  @IsUUID()
  customerId!: string;

  @IsUUID()
  tableId!: string;

  @IsInt()
  @Min(1)
  people!: number;

  @IsDateString()
  startsAt!: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

