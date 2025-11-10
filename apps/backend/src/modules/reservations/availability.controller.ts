import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ReservationsService } from './reservations.service';
import { AvailabilityQueryDto } from './dto/availability-query.dto';

@Controller('availability')
@UseGuards(JwtAuthGuard)
export class AvailabilityController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Get()
  getAvailability(@Query() query: AvailabilityQueryDto) {
    return this.reservationsService.availability(query);
  }
}

