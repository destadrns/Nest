import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, ChangePasswordDto } from './dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SessionId } from '../../common/decorators/session-id.decorator';

const COOKIE_NAME = 'sff_session';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 86400000, // 24h
};

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register new user' })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(@Body() dto: RegisterDto, @Req() req: Request, @Res() res: Response) {
    const ipAddress = this.getIpAddress(req);
    const userAgent = req.headers['user-agent'] ?? '';

    const result = await this.authService.register(dto, ipAddress, userAgent);

    res.cookie(COOKIE_NAME, result.sessionId, COOKIE_OPTIONS);
    res.status(HttpStatus.CREATED).json({ data: { user: result.user } });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res() res: Response) {
    const ipAddress = this.getIpAddress(req);
    const userAgent = req.headers['user-agent'] ?? '';

    const result = await this.authService.login(dto, ipAddress, userAgent);

    res.cookie(COOKIE_NAME, result.sessionId, COOKIE_OPTIONS);
    res.json({ data: { user: result.user } });
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Logout' })
  async logout(
    @CurrentUser('id') userId: string,
    @SessionId() sessionId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const ipAddress = this.getIpAddress(req);
    const userAgent = req.headers['user-agent'] ?? '';

    await this.authService.logout(sessionId, userId, ipAddress, userAgent);

    res.clearCookie(COOKIE_NAME, { path: '/' });
    res.status(HttpStatus.NO_CONTENT).send();
  }

  @Post('password/change')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Change password' })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser('id') userId: string,
    @SessionId() sessionId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const ipAddress = this.getIpAddress(req);
    const userAgent = req.headers['user-agent'] ?? '';

    const result = await this.authService.changePassword(
      userId,
      dto,
      sessionId,
      ipAddress,
      userAgent,
    );

    // Set new session cookie after password change
    res.cookie(COOKIE_NAME, result.sessionId, COOKIE_OPTIONS);
    res.json({ data: { message: 'Password changed successfully' } });
  }

  @Get('session')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get current session info' })
  async getSession(@CurrentUser('id') userId: string, @SessionId() sessionId: string) {
    const session = await this.authService.getSession(sessionId);
    return { data: session };
  }

  @Get('sessions')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'List active sessions' })
  async getSessions(@CurrentUser('id') userId: string, @SessionId() sessionId: string) {
    const sessions = await this.authService.getUserSessions(userId, sessionId);
    return { data: sessions };
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Revoke a session' })
  async revokeSession(
    @Param('id') sessionIdToRevoke: string,
    @CurrentUser('id') userId: string,
    @SessionId() currentSessionId: string,
    @Req() req: Request,
  ) {
    const ipAddress = this.getIpAddress(req);
    const userAgent = req.headers['user-agent'] ?? '';

    await this.authService.revokeSession(
      sessionIdToRevoke,
      userId,
      currentSessionId,
      ipAddress,
      userAgent,
    );
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser('id') userId: string) {
    const user = await this.authService.getProfile(userId);
    return { data: user };
  }

  private getIpAddress(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') return forwarded.split(',')[0]!.trim();
    return req.ip ?? req.socket.remoteAddress ?? 'unknown';
  }
}
