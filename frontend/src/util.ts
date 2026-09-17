import { jwtDecode } from 'jwt-decode';
import type { JwtFields } from '@stocked/backend/src/variables.ts';

const TOKEN_KEY = 'token';

export function saveJwt(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getJwt(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearJwt(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function titleCase(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function getAuthentication(): JwtFields | null {
  const token = getJwt();

  if (!token) {
    return null;
  }

  try {
    const model = jwtDecode<JwtFields>(token);
    if (!model.exp || model.exp * 1000 <= Date.now()) {
      clearJwt();
      return null;
    }
    return model;
  } catch {
    clearJwt();
    return null;
  }
}