import { Link, useNavigate } from 'react-router';
import { APP_NAME } from '../constants';
import logo from '../assets/logo.png';
import { clearJwt, getAuthentication } from '../util';

export default function Navbar() {
  const authenticated = getAuthentication();
  const navigate = useNavigate();

  const logout = () => {
    clearJwt();
    navigate('/', { replace: true });
  };

  return (
    <nav className="border-b border-(--border) bg-(--bg)/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Link
              to="/"
              className="text-2xl font-bold text-(--text-h) flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              <img src={logo} alt={APP_NAME} className="w-8 h-8" />
              <span>{APP_NAME}</span>
            </Link>
          </div>
          {authenticated ? (
            <div className="flex items-center space-x-3 sm:space-x-4">
              <span className="text-sm sm:text-base font-medium text-(--text)">
                Welcome, <span className="font-semibold text-(--text-h)">{authenticated.username}</span>
              </span>
              <Link
                to="/dashboard"
                className="btn-secondary"
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={logout}
                className="btn"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-3 sm:space-x-4">
              <Link
                to="/login"
                className="px-4 py-2 text-(--text-h) rounded-lg border border-(--border) hover:bg-(--secondary)/10 font-medium transition-all active:scale-95 shadow-sm"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="px-4 py-2 bg-(--primary) hover:bg-(--primary-soft) text-white font-medium rounded-lg transition-all active:scale-95 shadow-sm"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
