import { APP_NAME } from '../constants';

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col">
      <section
        className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 space-y-8">
        <div className="space-y-4 max-w-3xl">
          <h1
            className="text-5xl md:text-7xl font-bold tracking-tight text-(--text-h) leading-tight">
            Keep track of <span className="text-(--accent)">everything</span>
          </h1>
          <p className="text-xl md:text-2xl text-(--text) max-w-2xl mx-auto">
            Track every food item, expiry dates, and more with <span
            className="font-semibold">{APP_NAME}</span>. Never let your food go
            to waste again!
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <a
            href="/signup"
            className="px-8 py-3 bg-(--primary) text-white font-semibold rounded-lg hover:shadow-lg hover:bg-(--primary-soft) transition-all">
            Sign Up
          </a>
          <a
            href="/login"
            className="px-8 py-3 bg-transparent border border-(--border) text-(--text-h) font-semibold rounded-lg hover:bg-(--background) hover:border-(--primary) transition-all">
            Login
          </a>
        </div>
      </section>
    </div>
  );
}