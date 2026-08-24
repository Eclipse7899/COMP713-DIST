import { Link } from 'react-router';
import { APP_NAME } from '../constants';
import logo from '../assets/logo.png';

export default function Navbar() {
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

          <div className="hidden md:flex items-center space-x-8">
            <Link to="/"
                  className="text-(--text) hover:text-(--primary) transition-colors font-medium">Home</Link>
            <a href="#"
               className="text-(--text) hover:text-(--primary) transition-colors font-medium">Features</a>
            <a href="#"
               className="text-(--text) hover:text-(--primary) transition-colors font-medium">Pricing</a>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              to="/login"
              className="px-4 py-2 text-(--text-h) font-medium hover:text-(--primary) transition-colors"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="px-5 py-2 bg-(--primary) text-white font-semibold rounded-full hover:shadow-lg hover:shadow-blue-500/20 transition-all active:scale-95 shadow-sm"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
