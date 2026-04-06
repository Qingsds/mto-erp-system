import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

export function verifyPassword(
  password: string,
  storedPasswordHash: string,
): boolean {
  const [salt, storedHash] = storedPasswordHash.split(':');
  if (!salt || !storedHash) {
    return false;
  }

  const passwordHash = scryptSync(password, salt, 64);
  const storedHashBuffer = Buffer.from(storedHash, 'hex');

  if (passwordHash.byteLength !== storedHashBuffer.byteLength) {
    return false;
  }

  return timingSafeEqual(passwordHash, storedHashBuffer);
}
