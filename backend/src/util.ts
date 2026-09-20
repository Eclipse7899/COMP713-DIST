import bcrypt from 'bcrypt';

export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function comparePasswords(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}
