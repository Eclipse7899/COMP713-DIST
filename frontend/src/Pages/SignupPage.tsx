import {APP_NAME} from "../constants";

export default function SignupPage() {
    return (
        <div className="flex-1 flex items-center justify-center px-4 py-20">
            <div
                className="w-full max-w-md p-8 space-y-6 bg-[var(--bg)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow)] text-center">
                <h1 className="text-3xl font-bold text-[var(--text-h)]">Create an account</h1>
                <p className="text-[var(--text)]">Sign up to get started with {APP_NAME}.</p>
                <div
                    className="p-4 bg-[var(--accent-bg)] border border-[var(--accent-border)] rounded-lg text-sm text-[var(--accent)] font-medium">
                    Signup functionality is coming soon!
                </div>
                <button
                    disabled
                    className="w-full py-2 px-4 bg-[var(--primary)] text-white font-semibold rounded-lg opacity-50 cursor-not-allowed"
                >
                    Sign up
                </button>
            </div>
        </div>
    );
}
