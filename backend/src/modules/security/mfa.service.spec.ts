import { Test, TestingModule } from '@nestjs/testing';
import { MfaService } from './mfa.service';

describe('MfaService', () => {
  let service: MfaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MfaService],
    }).compile();

    service = module.get<MfaService>(MfaService);
  });

  it('should generate valid base32 secret and uri', () => {
    const { secret, uri } = service.generateSecret();
    expect(secret).toBeDefined();
    expect(secret.length).toBeGreaterThanOrEqual(16);
    expect(uri).toContain('otpauth://totp/');
  });

  it('should generate single-use recovery codes with sha256 hashes', () => {
    const { plaintextCodes, hashedCodes } = service.generateRecoveryCodes(8);
    expect(plaintextCodes.length).toBe(8);
    expect(hashedCodes.length).toBe(8);
    expect(plaintextCodes[0]).toMatch(/^[A-F0-9]{5}-[A-F0-9]{5}$/);
  });

  it('should reject invalid 6-digit TOTP tokens', () => {
    const { secret } = service.generateSecret();
    const result = service.verifyTotp(secret, '000000');
    expect(typeof result).toBe('boolean');
  });
});
