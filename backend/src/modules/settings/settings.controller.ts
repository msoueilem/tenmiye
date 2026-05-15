import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private settings: SettingsService) {}

  @ApiOperation({ summary: 'Get public landing page content — no auth required' })
  @Get('public')
  getPublic() {
    return this.settings.getPublic();
  }

  @ApiOperation({ summary: 'Update public landing page content — admin only' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_SETTINGS)
  @Patch()
  update(@Body() dto: UpdateSettingsDto) {
    return this.settings.update(dto);
  }
}
