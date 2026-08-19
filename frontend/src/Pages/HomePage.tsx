import {APP_NAME} from "../constants";

export default function HomePage() {
    return (
        <div className="flex-1 flex flex-col">
            <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 space-y-8">
                <div className="space-y-4 max-w-3xl">
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-[var(--text-h)] leading-tight">
                        Keep track of <span className="text-[var(--accent)]">everything</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-[var(--text)] max-w-2xl mx-auto">
                        Track every food item, expiry dates, and more with <span
                        className="font-semibold">{APP_NAME}</span>. Never let your food go to waste again!
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                    <button
                        className="px-8 py-3 bg-[var(--primary)] text-white font-semibold rounded-full hover:shadow-lg hover:bg-[var(--primary-soft)] transition-all">
                        Sign Up
                    </button>
                    <button
                        className="px-8 py-3 bg-transparent border border-[var(--border)] text-[var(--text-h)] font-semibold rounded-full hover:bg-[var(--background)] hover:border-[var(--primary)] transition-all">
                        Login
                    </button>
                </div>
            </section>
        </div>
    );
}