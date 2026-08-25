import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { RedisService } from '../../redis/redis.service';

export interface SessionData {
  userId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: number;
  lastActiveAt: number;
  expiresAt: number;
}

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly maxAge: number;
  private readonly idleTimeout: number;
  private readonly SESSION_PREFIX = 'session:';
  private readonly USER_SESSIONS_PREFIX = 'user-sessions:';

  constructor(
    private readonly redis: RedisService,
    private configService: ConfigService,
  ) {
    this.maxAge = Number(this.configService.get('SESSION_MAX_AGE') ?? 86400000); // 24h
    this.idleTimeout = Number(this.configService.get('SESSION_IDLE_TIMEOUT') ?? 7200000); // 2h
  }

  /** Generate cryptographically random session ID */
  generateSessionId(): string {
    return randomBytes(32).toString('hex');
  }

  /** Create new session in Redis */
  async create(userId: string, ipAddress: string, userAgent: string): Promise<string> {
    const sessionId = this.generateSessionId();
    const now = Date.now();

    const data: SessionData = {
      userId,
      ipAddress,
      userAgent,
      createdAt: now,
      lastActiveAt: now,
      expiresAt: now + this.maxAge,
    };

    const ttlSeconds = Math.ceil(this.maxAge / 1000);

    await this.redis.client
      .multi()
      .set(this.SESSION_PREFIX + sessionId, JSON.stringify(data), 'EX', ttlSeconds)
      .sadd(this.USER_SESSIONS_PREFIX + userId, sessionId)
      .exec();

    this.logger.log(`Session created for user ${userId}`);
    return sessionId;
  }

  /** Validate and return session data, enforcing both absolute and idle timeouts */
  async validate(sessionId: string): Promise<SessionData | null> {
    const raw = await this.redis.client.get(this.SESSION_PREFIX + sessionId);
    if (!raw) return null;

    const data: SessionData = JSON.parse(raw);
    const now = Date.now();

    // Absolute timeout
    if (now > data.expiresAt) {
      await this.destroy(sessionId, data.userId);
      return null;
    }

    // Idle timeout
    if (now - data.lastActiveAt > this.idleTimeout) {
      await this.destroy(sessionId, data.userId);
      return null;
    }

    // Touch last active (update without extending absolute expiry)
    data.lastActiveAt = now;
    const remainingTtl = Math.ceil((data.expiresAt - now) / 1000);
    if (remainingTtl > 0) {
      await this.redis.client.set(
        this.SESSION_PREFIX + sessionId,
        JSON.stringify(data),
        'EX',
        remainingTtl,
      );
    }

    return data;
  }

  /** Destroy a single session */
  async destroy(sessionId: string, userId: string): Promise<void> {
    await this.redis.client
      .multi()
      .del(this.SESSION_PREFIX + sessionId)
      .srem(this.USER_SESSIONS_PREFIX + userId, sessionId)
      .exec();
  }

  /** Get all active sessions for a user */
  async getUserSessions(userId: string): Promise<Array<{ id: string } & SessionData>> {
    const sessionIds = await this.redis.client.smembers(this.USER_SESSIONS_PREFIX + userId);
    const sessions: Array<{ id: string } & SessionData> = [];

    for (const sid of sessionIds) {
      const raw = await this.redis.client.get(this.SESSION_PREFIX + sid);
      if (raw) {
        sessions.push({ id: sid, ...JSON.parse(raw) });
      } else {
        // Clean up stale reference
        await this.redis.client.srem(this.USER_SESSIONS_PREFIX + userId, sid);
      }
    }

    return sessions;
  }

  /** Revoke all sessions for a user */
  async destroyAllForUser(userId: string): Promise<void> {
    const sessionIds = await this.redis.client.smembers(this.USER_SESSIONS_PREFIX + userId);
    if (sessionIds.length === 0) return;

    const pipeline = this.redis.client.multi();
    for (const sid of sessionIds) {
      pipeline.del(this.SESSION_PREFIX + sid);
    }
    pipeline.del(this.USER_SESSIONS_PREFIX + userId);
    await pipeline.exec();

    this.logger.log(`All sessions destroyed for user ${userId}`);
  }

  /** Regenerate session ID (e.g., after privilege change to prevent fixation) */
  async regenerate(
    oldSessionId: string,
    userId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<string> {
    await this.destroy(oldSessionId, userId);
    return this.create(userId, ipAddress, userAgent);
  }
}
