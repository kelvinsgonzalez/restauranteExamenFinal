export class TableOccupancyDto {
  tableId!: string;
  tableNumber!: number;
  capacity!: number;
  status!: "AVAILABLE" | "OCCUPIED";
  until?: string;
  reservationId?: string;
  customerName?: string;
}
