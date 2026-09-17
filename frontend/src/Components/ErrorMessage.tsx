export default function ErrorMessage({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-lg">
      {message}
    </div>
  );
}
