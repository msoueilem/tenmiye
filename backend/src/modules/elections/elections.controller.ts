import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ElectionsService } from './elections.service';
import { CreateElectionDto } from './dto/create-election.dto';
import { SubmitNominationDto } from './dto/submit-nomination.dto';
import { CastVoteDto } from './dto/cast-vote.dto';
import { AdvanceElectionDto } from './dto/advance-election.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { UserTypeGuard } from '../../common/guards/user-type.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { RequireUserType } from '../../common/decorators/user-type.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { JwtPayload } from '../../common/strategies/jwt.strategy';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UpdateElectionDto } from './dto/update-election.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@ApiTags('elections')
@Controller('elections')
export class ElectionsController {
  constructor(private readonly elections: ElectionsService) {}

  @ApiOperation({ summary: 'Get all elections — no auth required' })
  @Get()
  findAll() {
    return this.elections.findAll();
  }

  @ApiOperation({ summary: 'Get an election by ID — no auth required' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.elections.findOne(id);
  }

  @ApiOperation({ summary: 'Get vote tally for an election — no auth required' })
  @Get(':id/results')
  getResults(@Param('id') id: string) {
    return this.elections.getResults(id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: "Check whether the authenticated user has voted in this election" })
  @Get(':id/my-vote')
  @UseGuards(JwtAuthGuard)
  getMyVote(@Param('id') id: string, @Req() req: { user: JwtPayload }) {
    return this.elections.getMyVote(id, req.user.userId);
  }

  @ApiOperation({ summary: 'Get top nominees by nomination count — no auth required' })
  @Get(':id/nominations/top')
  getTopNominees(@Param('id') id: string) {
    return this.elections.getTopNominees(id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new election' })
  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_ELECTIONS)
  create(@Body() dto: CreateElectionDto, @Req() req: { user: JwtPayload }) {
    return this.elections.create(dto, req.user.userId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a draft election' })
  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_ELECTIONS)
  update(@Param('id') id: string, @Body() dto: UpdateElectionDto) {
    return this.elections.update(id, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update schedule dates for any election (does not change status)' })
  @Patch(':id/schedule')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_ELECTIONS)
  updateSchedule(@Param('id') id: string, @Body() dto: UpdateScheduleDto) {
    return this.elections.updateSchedule(id, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a draft election — admin only' })
  @Delete(':id')
  @UseGuards(JwtAuthGuard, UserTypeGuard, PermissionsGuard)
  @RequireUserType('admin')
  @RequirePermissions(Permission.MANAGE_ELECTIONS)
  remove(@Param('id') id: string) {
    return this.elections.remove(id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Advance election status (draft→nomination→dismissal→voting→completed)' })
  @Post(':id/advance')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_ELECTIONS)
  advance(
    @Param('id') id: string,
    @Body() dto: AdvanceElectionDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.elections.advance(id, dto, req.user.userId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Finalize results for a completed board election' })
  @Post(':id/finalize')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_ELECTIONS)
  finalize(@Param('id') id: string, @Req() req: { user: JwtPayload }) {
    return this.elections.finalizeResults(id, req.user.userId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: "Check whether the authenticated member has submitted nominations for this round" })
  @Get(':id/nominations/me')
  @UseGuards(JwtAuthGuard, UserTypeGuard)
  @RequireUserType('member')
  getMyNomination(@Param('id') id: string, @Req() req: { user: JwtPayload }) {
    return this.elections.getMyNomination(id, req.user.userId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit nominations for a board election' })
  @Post(':id/nominations')
  @UseGuards(JwtAuthGuard, UserTypeGuard)
  @RequireUserType('member')
  submitNomination(
    @Param('id') id: string,
    @Body() dto: SubmitNominationDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.elections.submitNomination(id, dto, req.user.userId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Opt out of nomination during the dismissal phase' })
  @Delete(':id/nominations/me')
  @UseGuards(JwtAuthGuard, UserTypeGuard)
  @RequireUserType('member')
  dismissSelf(@Param('id') id: string, @Req() req: { user: JwtPayload }) {
    return this.elections.dismissSelf(id, req.user.userId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cast a vote in an election' })
  @Post(':id/votes')
  @UseGuards(JwtAuthGuard, UserTypeGuard)
  @RequireUserType('member')
  castVote(
    @Param('id') id: string,
    @Body() dto: CastVoteDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.elections.castVote(id, dto, req.user.userId);
  }
}
