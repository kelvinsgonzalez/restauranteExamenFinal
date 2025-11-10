import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { UpdateSettingDto } from './dto/update-setting.dto';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  get() {
    return this.settingsService.getOrCreate();
  }

  @Patch()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Body() dto: UpdateSettingDto) {
    return this.settingsService.update(dto);
  }
}

