import { Navigate, Outlet } from 'react-router';
import { getAuthentication } from '../util';

export default function AuthenticatedRoute() {
  if (getAuthentication() === null) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}