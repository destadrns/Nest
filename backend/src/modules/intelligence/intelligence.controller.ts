import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { FamilyRole } from '@prisma/client';
import { IntelligenceService } from './intelligence.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Intelligence Layer')
@Controller('families/:familyId/intelligence')
@UseGuards(AuthGuard, RolesGuard)
export class IntelligenceController {
  constructor(private readonly intelligenceService: IntelligenceService) {}

  @Get('suggest-category')
  @Roles(FamilyRole.MEMBER)
  @ApiOperation({ summary: 'Auto-categorize a transaction description' })
  @ApiQuery({ name: 'description', required: true })
  async suggestCategory(
    @Param('familyId') familyId: string,
    @Query('description') description: string,
  ) {
    const suggestion = await this.intelligenceService.suggestCategory(familyId, description || '');
    return { data: suggestion };
  }

  @Get('anomalies')
  @Roles(FamilyRole.VIEWER)
  @ApiOperation({ summary: 'Detect unusual spending spikes or patterns' })
  async detectAnomalies(@Param('familyId') familyId: string) {
    const anomalies = await this.intelligenceService.detectAnomalies(familyId);
    return { data: anomalies };
  }

  @Get('forecast')
  @Roles(FamilyRole.VIEWER)
  @ApiOperation({ summary: 'Forecast upcoming expenses and category spending' })
  async getForecast(@Param('familyId') familyId: string) {
    const forecast = await this.intelligenceService.generateForecast(familyId);
    return { data: forecast };
  }
}
