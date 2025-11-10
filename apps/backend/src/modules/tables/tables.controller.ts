import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TablesService } from './tables.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';

@Controller('tables')
@UseGuards(JwtAuthGuard)
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Get()
  findAll(@Query('isActive') isActive?: string) {
    return this.tablesService.findAll(
      typeof isActive === 'string' ? isActive === 'true' : undefined,
    );
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateTableDto) {
    return this.tablesService.create(dto);
  }

  @Get('availability')
  findAvailability(
    @Query('date') date?: string,
    @Query('time') time?: string,
    @Query('people', new DefaultValuePipe(1), ParseIntPipe) people?: number,
  ) {
    if (!date || !time) {
      throw new BadRequestException('date and time are required');
    }
    return this.tablesService.getAvailability({
      date,
      time,
      people: Math.max(1, people ?? 1),
    });
  }

  @Get('occupancy')
  findOccupancy(
    @Query('date') date?: string,
    @Query('time') time?: string,
  ) {
    if (!date || !time) {
      throw new BadRequestException('date and time are required');
    }
    return this.tablesService.getOccupancy({ date, time });
  }

  @Get('suggestions')
  findSuggestions(
    @Query('date') date?: string,
    @Query('people', new DefaultValuePipe(1), ParseIntPipe) people?: number,
  ) {
    if (!date) {
      throw new BadRequestException('date is required');
    }
    return this.tablesService.getSlotSuggestions(date, Math.max(1, people ?? 1));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tablesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateTableDto) {
    return this.tablesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.tablesService.remove(id);
  }
}

