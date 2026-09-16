import { Navigate, Outlet } from 'react-router';
import { jwtDecode } from 'jwt-decode';
import { clearJwt, getJwt } from '../../util.ts';


export default function ProtectedRoute() {
  const token = getJwt();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  try {
    const { exp } = jwtDecode(token);

    if (!exp || exp * 1000 <= Date.now()) {
      clearJwt();
      return <Navigate to="/login" replace />;
    }
  } catch {
    clearJwt();
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}