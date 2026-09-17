import { Link, useNavigate } from 'react-router';
import { APP_NAME } from '../constants';
import logo from '../assets/logo.png';
import { getAuthentication } from '../util.ts';
import { clearJwt } from '../../util.ts';

export default function Navbar() {
  const authenticated = getAuthentication();
  const navigate = useNavigate();

  const logout = () => {
    clearJwt();
    navigate("/", { replace: true });
  }

  return (
    <nav
      className="border-b border-(--border) bg-(--bg)/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Link to="/"
                  className="text-2xl font-bold text-(--text-h) flex items-center gap-2">
              <img src={logo} alt={APP_NAME} className="w-8 h-8"/>
              <span>{APP_NAME}</span>
            </Link>
          </div>
          {(authenticated ? (
                <div className="flex items-center space-x-4">
                  <div>
                    <span className="px-4 py-2 text-(--text-h) font-medium transition-colors">
                      Welcome, {authenticated.username}
                    </span>
                  </div>
                  <Link
                    to="/dashboard"
                    className="px-4 py-2 text-(--text-h) rounded-lg border border-(--secondary) hover:bg-(--secondary)/10 font-medium transition-colors active:scale-95 shadow-sm"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={logout}
                    className="px-4 py-2 bg-(--primary) rounded-lg text-(--text-h) font-medium transition-colors hover:shadow-(--primary)/10 active:scale-95 shadow-sm"
                  >
                    Logout
                  </button>
                </div>
              ) :
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className="px-4 py-2 bg-(--primary) rounded-lg text-(--text-h) font-medium transition-colors hover:bg-(--primary)/80"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 text-(--text-h) rounded-lg border border-(--secondary) hover:bg-(--secondary)/10 hover:shadow-(--primary)/10 transition-colors hover:bg-(--primary)/80 active:scale-95 shadow-sm"
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
