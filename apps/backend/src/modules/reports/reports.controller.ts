import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('occupancy')
  occupancy(
    @Query('range') range: 'day' | 'week' = 'day',
    @Query('date') date?: string,
  ) {
    return this.reportsService.occupancy(range, date ?? new Date().toISOString());
  }
}

