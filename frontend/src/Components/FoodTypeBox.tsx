import * as React from 'react';
import type { FoodType } from '../models';
import { titleCase } from '../util';

export default function FoodTypeBox({
  foodType,
  onDelete,
}: {
  foodType: FoodType;
  onDelete: (id: string) => Promise<void>;
}) {
  const [isDeleting, setIsDeleting] = React.useState(false);

  async function handleDelete(id: string) {
    setIsDeleting(true);
    try {
      await onDelete(id);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-row items-center justify-between gap-4 py-1">
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-(--text-h) truncate">
            {foodType.name}
          </span>
          {foodType.createdByUserId && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-(--accent-bg) text-(--accent)">
              Custom
            </span>
          )}
        </div>
        <div className="text-sm text-(--text)">
          {titleCase(foodType.category)}
        </div>
      </div>

      {foodType.createdByUserId && (
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => handleDelete(foodType.id)}
            disabled={isDeleting}
            className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-900/50 rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      )}
    </div>
  );
}