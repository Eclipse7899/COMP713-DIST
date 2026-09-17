import * as React from 'react';
import type { FoodType } from '../models.ts';
import { titleCase } from '../util.ts';


export default function FoodTypeBox({ foodType, onDelete }: {
  foodType: FoodType,
  onDelete: (id: string) => Promise<void>
}) {

  return (
    <div className="flex flex-row gap-4 items-center">
      <div className={'flex flex-col gap-1 flex-1'}>
        <div className="flex flex-row gap-2 items-center">
          <div className="text-lg font-semibold">
            {foodType.name}
          </div>
          {(foodType.createdByUserId &&
            <div className="text-xs text-(--text-muted) italic"> - Custom</div>
          )}
        </div>
        <div className="text-sm">
          {titleCase(foodType.category)}
        </div>
      </div>
      {(foodType.createdByUserId &&
        <div>
          <button
            type="button"
            onClick={() => onDelete(foodType.id)}
            className="px-4 py-2 rounded-lg bg-white text-red-700 dark:bg-red-700 dark:text-white border-0"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}