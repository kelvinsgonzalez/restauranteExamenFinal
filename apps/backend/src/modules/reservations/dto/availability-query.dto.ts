import { IsDateString, IsInt, Matches, Min } from 'class-validator';

export class AvailabilityQueryDto {
  @IsDateString()
  date!: string; // YYYY-MM-DD

  @Matches(/^\d{2}:\d{2}$/)
  time!: string; // HH:mm

  @IsInt()
  @Min(1)
  people!: number;
}
