import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { BoardsService } from './boards.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UpdateBoardDto } from './dto/update-board.dto';

@ApiTags('boards')
@ApiBearerAuth()
@Controller('boards')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BoardsController {
  constructor(private readonly boards: BoardsService) {}

  @ApiOperation({ summary: 'Get all boards' })
  @Get()
  findAll() {
    return this.boards.findAll();
  }

  @ApiOperation({ summary: 'Get a board by ID' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.boards.findOne(id);
  }

  @ApiOperation({ summary: 'Create a new board' })
  @Post()
  @RequirePermissions(Permission.MANAGE_BOARDS)
  create(@Body() dto: CreateBoardDto) {
    return this.boards.create(dto);
  }

  @ApiOperation({ summary: 'Update a board by ID' })
  @Patch(':id')
  @RequirePermissions(Permission.MANAGE_BOARDS)
  update(@Param('id') id: string, @Body() dto: UpdateBoardDto) {
    return this.boards.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete a board by ID' })
  @Delete(':id')
  @RequirePermissions(Permission.MANAGE_BOARDS)
  remove(@Param('id') id: string) {
    return this.boards.remove(id);
  }

  @ApiOperation({ summary: 'Create a role for a specific board' })
  @Post(':boardId/roles')
  @RequirePermissions(Permission.MANAGE_BOARDS)
  createRole(@Param('boardId') boardId: string, @Body() dto: CreateRoleDto) {
    return this.boards.createRole(boardId, dto);
  }
}
