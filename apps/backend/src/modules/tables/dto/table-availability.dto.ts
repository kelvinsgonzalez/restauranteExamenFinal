export class TableAvailabilityDto {
  id!: string;
  name?: string | null;
  number?: number | null;
  capacity!: number;
  status!: 'AVAILABLE' | 'OCCUPIED';
}

