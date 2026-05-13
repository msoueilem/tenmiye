import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import { CreatePaymentChannelDto } from './dto/create-payment-channel.dto';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { JwtPayload } from '../../common/strategies/jwt.strategy';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('finance')
@ApiBearerAuth()
@Controller('finance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @ApiOperation({ summary: 'Get all payment channels' })
  @Get('payment-channels')
  findAllPaymentChannels() {
    return this.finance.findAllPaymentChannels();
  }

  @ApiOperation({ summary: 'Create a new payment channel' })
  @Post('payment-channels')
  @RequirePermissions(Permission.MANAGE_PAYMENT_CHANNELS)
  createPaymentChannel(@Body() dto: CreatePaymentChannelDto) {
    return this.finance.createPaymentChannel(dto);
  }

  @ApiOperation({ summary: 'Get all contributions' })
  @Get('contributions')
  @RequirePermissions(Permission.READ_FINANCE)
  findAllContributions() {
    return this.finance.findAllContributions();
  }

  @ApiOperation({ summary: 'Create a new contribution' })
  @Post('contributions')
  @RequirePermissions(Permission.RECORD_CONTRIBUTIONS)
  createContribution(
    @Body() dto: CreateContributionDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.finance.createContribution(dto, req.user);
  }

  @ApiOperation({ summary: 'Verify a contribution by ID' })
  @Patch('contributions/:id/verify')
  @RequirePermissions(Permission.VERIFY_CONTRIBUTIONS)
  verifyContribution(@Param('id') id: string) {
    return this.finance.verifyContribution(id);
  }

  @ApiOperation({ summary: 'Get all expenses' })
  @Get('expenses')
  @RequirePermissions(Permission.READ_FINANCE)
  findAllExpenses() {
    return this.finance.findAllExpenses();
  }

  @ApiOperation({ summary: 'Create a new expense' })
  @Post('expenses')
  @RequirePermissions(Permission.RECORD_EXPENSES)
  createExpense(
    @Body() dto: CreateExpenseDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.finance.createExpense(dto, req.user);
  }
}
