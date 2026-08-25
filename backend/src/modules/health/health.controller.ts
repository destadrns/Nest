import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('/health')
  @ApiOperation({ summary: 'Health check' })
  async health() {
    return this.healthService.check();
  }

  @Get('/ready')
  @ApiOperation({ summary: 'Readiness check' })
  async ready() {
    return this.healthService.readiness();
  }
}
