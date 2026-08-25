import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { FamilyRole } from '@prisma/client';
import { DataPortabilityService } from './data-portability.service';
import { ImportTransactionsDto } from './dto/data-portability.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Data Portability')
@Controller('families/:familyId/portability')
@UseGuards(AuthGuard, RolesGuard)
export class DataPortabilityController {
  constructor(private readonly portabilityService: DataPortabilityService) {}

  @Post('import/preview')
  @Roles(FamilyRole.MEMBER)
  @ApiOperation({ summary: 'Preview CSV/JSON transaction import and check duplicates' })
  async preview(
    @Param('familyId') familyId: string,
    @Body() dto: ImportTransactionsDto,
  ) {
    const result = await this.portabilityService.previewImport(familyId, dto);
    return { data: result };
  }

  @Post('import/execute')
  @Roles(FamilyRole.MEMBER)
  @ApiOperation({ summary: 'Execute transaction import with duplicate protection' })
  @ApiQuery({ name: 'skipDuplicates', required: false, type: Boolean })
  async execute(
    @Param('familyId') familyId: string,
    @Body() dto: ImportTransactionsDto,
    @CurrentUser('id') userId: string,
    @Query('skipDuplicates') skipDuplicates?: string,
  ) {
    const result = await this.portabilityService.executeImport(
      familyId,
      dto,
      userId,
      skipDuplicates !== 'false',
    );
    return { data: result };
  }

  @Get('export')
  @Roles(FamilyRole.ADMIN)
  @ApiOperation({ summary: 'Export complete family financial data (GDPR portability)' })
  async export(@Param('familyId') familyId: string) {
    const data = await this.portabilityService.exportFamilyData(familyId);
    return { data };
  }
}
