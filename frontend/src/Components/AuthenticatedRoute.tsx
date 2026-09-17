import { Navigate, Outlet } from 'react-router';
import { getAuthentication } from '../util.ts';


export default function ProtectedRoute() {
  if (getAuthentication() === null) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}