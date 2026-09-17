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
            <span className="chip bg-(--accent-bg) text-(--accent)">
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
            className="btn-danger">
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      )}
    </div>
  );
}