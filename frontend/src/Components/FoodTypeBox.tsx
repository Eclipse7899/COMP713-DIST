import * as React from 'react';
import type { EditFoodType, FoodType } from '../models';
import { titleCase } from '../util';
import { EditFoodTypeForm } from './Forms/EditFoodTypeForm.tsx';

export default function FoodTypeBox({
  foodType,
  onDelete,
  onEdit,
}: {
  foodType: FoodType;
  onDelete: (id: string) => Promise<void>;
  onEdit: (id: string, form: EditFoodType) => Promise<void>;
}) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);

  async function handleDelete(id: string) {
    setIsDeleting(true);
    try {
      await onDelete(id);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleEdit(id: string, form: EditFoodType) {
    await onEdit(id, form);
    setIsEditing(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row items-center gap-4">
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
          <div className="flex flex-row gap-4 items-center">
            <div className="flex items-center">
              <button className="btn-secondary" onClick={() => setIsEditing(true)}>
                Edit
              </button>
            </div>
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
      {(isEditing && (
        <div>
          <EditFoodTypeForm id={foodType.id} foodType={foodType} onCancel={() => setIsEditing(false)} onEdit={handleEdit} />
        </div>
        )
      )}
    </div>
  );
}