import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service.js';
import { UpdateSettingsDto } from './dto/update-settings.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';

@ApiTags('Store Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Get store settings (delivery fee, status, social links)',
  })
  getSettings() {
    return this.settingsService.getSettings();
  }

  @Patch()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update store settings (Admin)' })
  updateSettings(@Body() dto: UpdateSettingsDto) {
    return this.settingsService.updateSettings(dto);
  }
}
