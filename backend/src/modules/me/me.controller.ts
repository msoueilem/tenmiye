import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/strategies/jwt.strategy';
import { UsersService } from '../users/users.service';
import { UpdateMeDto } from './dto/update-me.dto';

@ApiTags('me')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('me')
export class MeController {
  constructor(private users: UsersService) {}

  @ApiOperation({ summary: "Get the authenticated member's own profile" })
  @Get()
  getMe(@CurrentUser() user: JwtPayload) {
    return this.users.findOne(user.userId);
  }

  @ApiOperation({ summary: "Update the authenticated member's own profile (name, city, region, photo)" })
  @Patch()
  updateMe(@CurrentUser() user: JwtPayload, @Body() dto: UpdateMeDto) {
    return this.users.update(user.userId, dto);
  }
}
