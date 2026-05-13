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
import { PartialType } from '@nestjs/mapped-types';

class UpdateBoardDto extends PartialType(CreateBoardDto) {}

@Controller('boards')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BoardsController {
  constructor(private readonly boards: BoardsService) {}

  @Get()
  findAll() {
    return this.boards.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.boards.findOne(id);
  }

  @Post()
  @RequirePermissions(Permission.MANAGE_BOARDS)
  create(@Body() dto: CreateBoardDto) {
    return this.boards.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.MANAGE_BOARDS)
  update(@Param('id') id: string, @Body() dto: UpdateBoardDto) {
    return this.boards.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.MANAGE_BOARDS)
  remove(@Param('id') id: string) {
    return this.boards.remove(id);
  }

  @Post(':boardId/roles')
  @RequirePermissions(Permission.MANAGE_BOARDS)
  createRole(@Param('boardId') boardId: string, @Body() dto: CreateRoleDto) {
    return this.boards.createRole(boardId, dto);
  }
}
