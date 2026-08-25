import { Module } from '@nestjs/common';
import { SecurityController } from './security.controller';
import { SecurityService } from './security.service';
import { MfaService } from './mfa.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [SecurityController],
  providers: [SecurityService, MfaService],
  exports: [SecurityService, MfaService],
})
export class SecurityModule {}
