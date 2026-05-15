import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/strategies/jwt.strategy';
import { UsersService } from '../users/users.service';
import { FirebaseService } from '../../common/firebase/firebase.service';
import { UpdateMeDto } from './dto/update-me.dto';

@ApiTags('me')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('me')
export class MeController {
  constructor(
    private users: UsersService,
    private firebase: FirebaseService,
  ) {}

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

  @ApiOperation({ summary: "Get the authenticated member's vote history" })
  @Get('votes')
  async getMyVotes(@CurrentUser() user: JwtPayload) {
    const snapshot = await this.firebase.db
      .collection('votes')
      .where('userId', '==', user.userId)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
}
