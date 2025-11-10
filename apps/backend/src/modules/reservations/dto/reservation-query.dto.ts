import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { ReservationStatus } from '../../../common/enums/reservation-status.enum';

export class ReservationQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;
}

