import { Injectable, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class MfaService {
  /**
   * Generate a base32 TOTP secret (160-bit standard).
   */
  generateSecret(): { secret: string; uri: string } {
    const buffer = crypto.randomBytes(20);
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < buffer.length; i++) {
      const byte = buffer[i]!;
      secret += alphabet[byte % 32];
    }
    const uri = `otpauth://totp/NEST:user?secret=${secret}&issuer=NEST`;
    return { secret, uri };
  }

  /**
   * Generate 8 single-use hex backup/recovery codes.
   */
  generateRecoveryCodes(count: number = 8): { plaintextCodes: string[]; hashedCodes: string[] } {
    const plaintextCodes: string[] = [];
    const hashedCodes: string[] = [];

    for (let i = 0; i < count; i++) {
      const raw = crypto.randomBytes(5).toString('hex').toUpperCase(); // 10 chars, e.g. "A1B2C3D4E5"
      const formatted = `${raw.slice(0, 5)}-${raw.slice(5)}`;
      plaintextCodes.push(formatted);
      const hash = crypto.createHash('sha256').update(formatted).digest('hex');
      hashedCodes.push(hash);
    }

    return { plaintextCodes, hashedCodes };
  }

  /**
   * Verify TOTP code against secret using standard RFC 6238 HMAC-SHA1 algorithm.
   * Window = 1 (allows current period +/- 30s for clock drift).
   */
  verifyTotp(secret: string, token: string): boolean {
    const cleanToken = token.trim().replace(/\s+/g, '');
    if (!/^\d{6}$/.test(cleanToken)) return false;

    const epoch = Math.floor(Date.now() / 1000);
    const timeStep = 30;
    const currentCounter = Math.floor(epoch / timeStep);

    for (let i = -1; i <= 1; i++) {
      const counter = currentCounter + i;
      const expectedToken = this.generateTotpToken(secret, counter);
      if (expectedToken === cleanToken) {
        return true;
      }
    }
    return false;
  }

  private generateTotpToken(secret: string, counter: number): string {
    const key = this.base32Decode(secret);
    const counterBuf = Buffer.alloc(8);
    counterBuf.writeBigInt64BE(BigInt(counter));

    const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest();
    const offset = hmac[hmac.length - 1]! & 0x0f;
    const binary =
      ((hmac[offset]! & 0x7f) << 24) |
      ((hmac[offset + 1]! & 0xff) << 16) |
      ((hmac[offset + 2]! & 0xff) << 8) |
      (hmac[offset + 3]! & 0xff);

    const otp = binary % 1_000_000;
    return otp.toString().padStart(6, '0');
  }

  private base32Decode(encoded: string): Buffer {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    const bytes: number[] = [];

    for (let i = 0; i < encoded.length; i++) {
      const char = encoded[i]?.toUpperCase() ?? '';
      const index = alphabet.indexOf(char);
      if (index === -1) continue;

      value = (value << 5) | index;
      bits += 5;

      if (bits >= 8) {
        bytes.push((value >> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }

    return Buffer.from(bytes);
  }
}
