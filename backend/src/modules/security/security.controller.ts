import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SecurityService } from './security.service';
import { EnableMfaDto, DisableMfaDto, PasskeyRegisterDto } from './dto/security.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Security Center')
@Controller('security')
@UseGuards(AuthGuard)
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get user security posture and audit logs' })
  async getSummary(@CurrentUser('id') userId: string) {
    const summary = await this.securityService.getSecuritySummary(userId);
    return { data: summary };
  }

  @Post('mfa/setup')
  @ApiOperation({ summary: 'Initiate TOTP MFA setup (returns QR URI & secret)' })
  async startMfa(@CurrentUser('id') userId: string) {
    const setup = await this.securityService.startMfaSetup(userId);
    return { data: setup };
  }

  @Post('mfa/enable')
  @ApiOperation({ summary: 'Verify and enable TOTP MFA' })
  async enableMfa(
    @CurrentUser('id') userId: string,
    @Body() dto: EnableMfaDto & { recoveryHashes?: string[] },
  ) {
    const result = await this.securityService.enableMfa(userId, dto, dto.recoveryHashes ?? []);
    return { data: result };
  }

  @Post('mfa/disable')
  @ApiOperation({ summary: 'Disable TOTP MFA with password confirmation' })
  async disableMfa(@CurrentUser('id') userId: string, @Body() dto: DisableMfaDto) {
    const result = await this.securityService.disableMfa(userId, dto);
    return { data: result };
  }

  @Get('passkeys')
  @ApiOperation({ summary: 'List registered WebAuthn passkeys' })
  async listPasskeys(@CurrentUser('id') userId: string) {
    const passkeys = await this.securityService.listPasskeys(userId);
    return { data: passkeys };
  }

  @Post('passkeys')
  @ApiOperation({ summary: 'Register a new WebAuthn passkey' })
  async registerPasskey(@CurrentUser('id') userId: string, @Body() dto: PasskeyRegisterDto) {
    const passkey = await this.securityService.registerPasskey(userId, dto);
    return { data: passkey };
  }

  @Delete('passkeys/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a WebAuthn passkey' })
  async deletePasskey(@CurrentUser('id') userId: string, @Param('id') id: string) {
    await this.securityService.deletePasskey(userId, id);
  }
}
