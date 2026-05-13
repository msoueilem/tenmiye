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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { JwtPayload } from '../../common/strategies/jwt.strategy';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UpdateElectionDto } from './dto/update-election.dto';

@ApiTags('elections')
@ApiBearerAuth()
@Controller('elections')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ElectionsController {
  constructor(private readonly elections: ElectionsService) {}

  @ApiOperation({ summary: 'Get all elections' })
  @Get()
  findAll() {
    return this.elections.findAll();
  }

  @ApiOperation({ summary: 'Get an election by ID' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.elections.findOne(id);
  }

  @ApiOperation({ summary: 'Create a new election' })
  @Post()
  @RequirePermissions(Permission.MANAGE_ELECTIONS)
  create(@Body() dto: CreateElectionDto, @Req() req: { user: JwtPayload }) {
    return this.elections.create(dto, req.user);
  }

  @ApiOperation({ summary: 'Update an election by ID' })
  @Patch(':id')
  @RequirePermissions(Permission.MANAGE_ELECTIONS)
  update(@Param('id') id: string, @Body() dto: UpdateElectionDto) {
    return this.elections.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete an election by ID' })
  @Delete(':id')
  @RequirePermissions(Permission.MANAGE_ELECTIONS)
  remove(@Param('id') id: string) {
    return this.elections.remove(id);
  }

  @ApiOperation({ summary: 'Submit a nomination for an election' })
  @Post(':id/nominations')
  submitNomination(
    @Param('id') id: string,
    @Body() dto: SubmitNominationDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.elections.submitNomination(id, dto, req.user);
  }

  @ApiOperation({ summary: 'Cast a vote in an election' })
  @Post(':id/votes')
  castVote(
    @Param('id') id: string,
    @Body() dto: CastVoteDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.elections.castVote(id, dto, req.user);
  }
}
