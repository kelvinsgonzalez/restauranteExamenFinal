import { ReservationCardDto } from './reservation-card.dto';

export class DashboardOverviewDto {
  totals!: {
    occupancyPercent: number;
    todayCount: number;
  };
  today!: ReservationCardDto[];
  upcoming!: { date: string; items: ReservationCardDto[] }[];
}

