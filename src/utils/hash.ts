import crypto from 'crypto';

export function messageHash(s: string) {
  return crypto.createHash('sha256').update(s).digest('hex');
}
