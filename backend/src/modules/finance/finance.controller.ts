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

@Controller('finance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get('payment-channels')
  findAllPaymentChannels() {
    return this.finance.findAllPaymentChannels();
  }

  @Post('payment-channels')
  @RequirePermissions(Permission.MANAGE_PAYMENT_CHANNELS)
  createPaymentChannel(@Body() dto: CreatePaymentChannelDto) {
    return this.finance.createPaymentChannel(dto);
  }

  @Get('contributions')
  @RequirePermissions(Permission.READ_FINANCE)
  findAllContributions() {
    return this.finance.findAllContributions();
  }

  @Post('contributions')
  @RequirePermissions(Permission.RECORD_CONTRIBUTIONS)
  createContribution(
    @Body() dto: CreateContributionDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.finance.createContribution(dto, req.user);
  }

  @Patch('contributions/:id/verify')
  @RequirePermissions(Permission.VERIFY_CONTRIBUTIONS)
  verifyContribution(@Param('id') id: string) {
    return this.finance.verifyContribution(id);
  }

  @Get('expenses')
  @RequirePermissions(Permission.READ_FINANCE)
  findAllExpenses() {
    return this.finance.findAllExpenses();
  }

  @Post('expenses')
  @RequirePermissions(Permission.RECORD_EXPENSES)
  createExpense(
    @Body() dto: CreateExpenseDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.finance.createExpense(dto, req.user);
  }
}
