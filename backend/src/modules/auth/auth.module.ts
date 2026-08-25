import { Global, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { PasswordService } from './password.service';
import { AuthGuard } from '../../common/guards/auth.guard';

@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthService, SessionService, PasswordService, AuthGuard],
  exports: [AuthService, SessionService, PasswordService, AuthGuard],
})
export class AuthModule {}
