import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  async readiness() {
    const checks: Record<string, { status: string; message?: string }> = {};

    // Database check
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks['database'] = { status: 'ok' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      checks['database'] = { status: 'error', message };
      this.logger.error('Database readiness check failed', message);
    }

    // Redis check
    try {
      const pong = await this.redis.ping();
      checks['redis'] = { status: pong ? 'ok' : 'error' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      checks['redis'] = { status: 'error', message };
      this.logger.error('Redis readiness check failed', message);
    }

    const allHealthy = Object.values(checks).every((c) => c.status === 'ok');

    return {
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    };
  }
}
