import { Navigate, Outlet } from 'react-router';
import { checkAuthentication } from '../util.ts';


export default function ProtectedRoute() {
  if (!checkAuthentication()) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}