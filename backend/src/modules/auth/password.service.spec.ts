import { Test, TestingModule } from '@nestjs/testing';
import { PasswordService } from './password.service';

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PasswordService],
    }).compile();

    service = module.get<PasswordService>(PasswordService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should securely hash and verify passwords using Argon2id', async () => {
    const password = 'CorrectHorseBatteryStaple!123';
    const hash = await service.hash(password);

    expect(hash).toBeDefined();
    expect(hash).toContain('$argon2id$');

    const isValid = await service.verify(hash, password);
    expect(isValid).toBe(true);

    const isInvalid = await service.verify(hash, 'WrongPassword!456');
    expect(isInvalid).toBe(false);
  });
});
