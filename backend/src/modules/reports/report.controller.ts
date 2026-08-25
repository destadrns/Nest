import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { FamilyRole } from '@prisma/client';
import { ReportService } from './report.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Reports')
@Controller('families/:familyId/reports')
@UseGuards(AuthGuard, RolesGuard)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('spending-by-category')
  @Roles(FamilyRole.VIEWER)
  @ApiOperation({ summary: 'Spending breakdown by category' })
  @ApiQuery({ name: 'from', required: true, example: '2026-01-01' })
  @ApiQuery({ name: 'to', required: true, example: '2026-12-31' })
  async spendingByCategory(
    @Param('familyId') familyId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const data = await this.reportService.getSpendingByCategory(familyId, {
      from: new Date(from),
      to: new Date(to),
    });
    return { data };
  }

  @Get('income-vs-expense')
  @Roles(FamilyRole.VIEWER)
  @ApiOperation({ summary: 'Income vs expense summary' })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  async incomeVsExpense(
    @Param('familyId') familyId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const data = await this.reportService.getIncomeVsExpense(familyId, {
      from: new Date(from),
      to: new Date(to),
    });
    return { data };
  }

  @Get('monthly-trend')
  @Roles(FamilyRole.VIEWER)
  @ApiOperation({ summary: 'Monthly income/expense trend' })
  @ApiQuery({ name: 'months', required: false, example: 12 })
  async monthlyTrend(@Param('familyId') familyId: string, @Query('months') months?: string) {
    const data = await this.reportService.getMonthlyTrend(
      familyId,
      months ? parseInt(months, 10) : 12,
    );
    return { data };
  }

  @Get('account-summary')
  @Roles(FamilyRole.VIEWER)
  @ApiOperation({ summary: 'Account balances and net worth' })
  async accountSummary(@Param('familyId') familyId: string) {
    const data = await this.reportService.getAccountSummary(familyId);
    return { data };
  }

  @Get('top-spending')
  @Roles(FamilyRole.VIEWER)
  @ApiOperation({ summary: 'Top spending by description' })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  async topSpending(
    @Param('familyId') familyId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.reportService.getTopSpending(
      familyId,
      { from: new Date(from), to: new Date(to) },
      limit ? parseInt(limit, 10) : 10,
    );
    return { data };
  }

  @Get('daily-spending')
  @Roles(FamilyRole.VIEWER)
  @ApiOperation({ summary: 'Daily spending for sparkline/heatmap' })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  async dailySpending(
    @Param('familyId') familyId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const data = await this.reportService.getDailySpending(familyId, {
      from: new Date(from),
      to: new Date(to),
    });
    return { data };
  }
}
