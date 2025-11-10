import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class UpdateSettingDto {
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  openHour?: string;

  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  closeHour?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(240)
  slotMinutes?: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  closedWeekdays?: number[];
}

