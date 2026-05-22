import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { CreatePaymentChannelDto } from './dto/create-payment-channel.dto';
import { UpdatePaymentChannelDto } from './dto/update-payment-channel.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ListTransactionsDto } from './dto/list-transactions.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { UserTypeGuard } from '../../common/guards/user-type.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { RequireUserType } from '../../common/decorators/user-type.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/strategies/jwt.strategy';
import { IsInt, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

class SummaryQueryDto {
  @ApiPropertyOptional({ example: 2026 })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  year!: number;

  @ApiPropertyOptional({ example: 5, minimum: 1, maximum: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  month?: number;
}

@ApiTags('finance')
@ApiBearerAuth()
@Controller('finance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  // ─── Payment Channels ───────────────────────────────────────────────────────

  @ApiOperation({ summary: 'List all payment channels' })
  @Get('payment-channels')
  findAllPaymentChannels() {
    return this.finance.findAllPaymentChannels();
  }

  @ApiOperation({ summary: 'Create a payment channel' })
  @Post('payment-channels')
  @RequirePermissions(Permission.MANAGE_PAYMENT_CHANNELS)
  createPaymentChannel(@Body() dto: CreatePaymentChannelDto) {
    return this.finance.createPaymentChannel(dto);
  }

  @ApiOperation({ summary: 'Update a payment channel' })
  @Patch('payment-channels/:id')
  @RequirePermissions(Permission.MANAGE_PAYMENT_CHANNELS)
  updatePaymentChannel(@Param('id') id: string, @Body() dto: UpdatePaymentChannelDto) {
    return this.finance.updatePaymentChannel(id, dto);
  }

  @ApiOperation({ summary: 'Delete a payment channel — admin only' })
  @Delete('payment-channels/:id')
  @UseGuards(JwtAuthGuard, UserTypeGuard, PermissionsGuard)
  @RequireUserType('admin')
  @RequirePermissions(Permission.MANAGE_PAYMENT_CHANNELS)
  removePaymentChannel(@Param('id') id: string) {
    return this.finance.removePaymentChannel(id);
  }

  // ─── Transactions ───────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'List transactions — filterable by type, year, month, userId' })
  @Get('transactions')
  @RequirePermissions(Permission.READ_FINANCE)
  findAllTransactions(@Query() query: ListTransactionsDto) {
    return this.finance.findAllTransactions(query);
  }

  @ApiOperation({ summary: 'Record a transaction (contribution, donation, or expense)' })
  @Post('transactions')
  @RequirePermissions(Permission.RECORD_CONTRIBUTIONS)
  createTransaction(@Body() dto: CreateTransactionDto, @CurrentUser() user: JwtPayload) {
    return this.finance.createTransaction(dto, user.userId);
  }

  @ApiOperation({ summary: 'Verify a transaction' })
  @Patch('transactions/:id/verify')
  @RequirePermissions(Permission.VERIFY_CONTRIBUTIONS)
  verifyTransaction(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.finance.verifyTransaction(id, user.userId);
  }

  // ─── Summary ────────────────────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Financial summary — totals by type for a given year (and optional month)',
  })
  @Get('summary')
  @RequirePermissions(Permission.READ_FINANCE)
  getSummary(@Query() query: SummaryQueryDto) {
    return this.finance.getSummary(query.year, query.month);
  }
}
