import { clearJwt, getJwt } from '../util.ts';
import { jwtDecode } from 'jwt-decode';
import type { JwtFields } from '@stocked/backend/src/variables.ts';

export function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function getAuthentication() {
  const token = getJwt();

  if (!token) {
    return null;
  }

  try {
    const model = jwtDecode<JwtFields>(token);
    if (!model.exp || model.exp * 1000 <= Date.now()) {
      clearJwt();
      return null;
    } else {
      return model;
    }
  } catch {
    clearJwt();
    return null;
  }
}