import { Link } from 'react-router';
import { APP_NAME } from '../constants';

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center">
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-16 sm:py-24 space-y-8 max-w-4xl mx-auto">
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-(--text-h) leading-tight">
            Keep track of <span className="text-(--accent)">everything</span>
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-(--text) max-w-2xl mx-auto leading-relaxed">
            Track every food item, expiry dates, and more with{' '}
            <span className="font-semibold text-(--text-h)">{APP_NAME}</span>. Never let your food go to waste again!
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center">
          <Link
            to="/signup"
            className="px-8 py-3 bg-(--primary) hover:bg-(--primary-soft) text-white font-semibold rounded-lg shadow-sm hover:shadow-lg transition-all active:scale-95 text-center"
          >
            Sign Up
          </Link>
          <Link
            to="/login"
            className="px-8 py-3 border border-(--border) hover:bg-(--secondary)/10 text-(--text-h) font-semibold rounded-lg shadow-sm transition-all active:scale-95 text-center"
          >
            Login
          </Link>
        </div>
      </section>
    </div>
  );
}