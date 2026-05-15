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

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new election' })
  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_ELECTIONS)
  create(@Body() dto: CreateElectionDto, @Req() req: { user: JwtPayload }) {
    return this.elections.create(dto, req.user);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an election by ID' })
  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_ELECTIONS)
  update(@Param('id') id: string, @Body() dto: UpdateElectionDto) {
    return this.elections.update(id, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an election by ID' })
  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_ELECTIONS)
  remove(@Param('id') id: string) {
    return this.elections.remove(id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a nomination for an election' })
  @Post(':id/nominations')
  @UseGuards(JwtAuthGuard)
  submitNomination(
    @Param('id') id: string,
    @Body() dto: SubmitNominationDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.elections.submitNomination(id, dto, req.user);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cast a vote in an election' })
  @Post(':id/votes')
  @UseGuards(JwtAuthGuard)
  castVote(
    @Param('id') id: string,
    @Body() dto: CastVoteDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.elections.castVote(id, dto, req.user);
  }
}
