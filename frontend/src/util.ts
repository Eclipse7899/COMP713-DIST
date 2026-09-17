import { clearJwt, getJwt } from '../util.ts';
import { jwtDecode } from 'jwt-decode';

export function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function checkAuthentication(): boolean {
  const token = getJwt();

  if (!token) {
    return false;
  }

  try {
    const { exp } = jwtDecode(token);
    if (!exp || exp * 1000 <= Date.now()) {
      clearJwt();
      return false;
    }
    else{
      return true;
    }
  } catch {
    clearJwt();
    return false;
  }
}