import { Injectable, Logger } from '@nestjs/common';
import * as argon2 from 'argon2';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PasswordService {
  private readonly logger = new Logger(PasswordService.name);
  private readonly memoryCost: number;
  private readonly timeCost: number;
  private readonly parallelism: number;

  constructor(private configService: ConfigService) {
    this.memoryCost = Number(this.configService.get('ARGON2_MEMORY') ?? 65536);
    this.timeCost = Number(this.configService.get('ARGON2_ITERATIONS') ?? 3);
    this.parallelism = Number(this.configService.get('ARGON2_PARALLELISM') ?? 4);
  }

  async hash(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: this.memoryCost,
      timeCost: this.timeCost,
      parallelism: this.parallelism,
    });
  }

  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch (error) {
      this.logger.error('Password verification failed', error);
      return false;
    }
  }
}
