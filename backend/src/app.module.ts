import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuditModule } from './modules/audit/audit.module';
import { FamilyModule } from './modules/families/family.module';
import { AccountModule } from './modules/accounts/account.module';
import { CategoryModule } from './modules/categories/category.module';
import { TransactionModule } from './modules/transactions/transaction.module';
import { BudgetModule } from './modules/budgets/budget.module';
import { GoalModule } from './modules/goals/goal.module';
import { RecurringModule } from './modules/recurring/recurring.module';
import { NotificationModule } from './modules/notifications/notification.module';
import { ReportModule } from './modules/reports/report.module';
import { SecurityModule } from './modules/security/security.module';
import { DataPortabilityModule } from './modules/data-portability/data-portability.module';
import { IntelligenceModule } from './modules/intelligence/intelligence.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { CorrelationIdInterceptor } from './common/interceptors/correlation-id.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    PrismaModule,
    RedisModule,
    AuditModule,
    HealthModule,
    AuthModule,
    FamilyModule,
    AccountModule,
    CategoryModule,
    TransactionModule,
    BudgetModule,
    GoalModule,
    RecurringModule,
    NotificationModule,
    ReportModule,
    SecurityModule,
    DataPortabilityModule,
    IntelligenceModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: CorrelationIdInterceptor },
  ],
})
export class AppModule {}
