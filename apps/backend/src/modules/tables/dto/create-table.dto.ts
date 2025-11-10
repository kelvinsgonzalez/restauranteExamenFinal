import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsPositive,
  Max,
  Min,
  IsString,
} from 'class-validator';

export class CreateTableDto {
  @IsInt()
  @IsPositive()
  number!: number;

  @IsInt()
  @Min(1)
  @Max(12)
  capacity!: number;

  @IsString()
  location!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

