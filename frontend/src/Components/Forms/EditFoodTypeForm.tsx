import * as React from 'react';
import {
  type EditFoodType,
  FOOD_CATEGORIES,
  type FoodCategory,
  type FoodType,
} from '../../models.ts';
import { titleCase } from '../../util.ts';

export function EditFoodTypeForm({
  id,
  foodType,
  onCancel,
  onEdit,
}: {
  id: string;
  foodType: FoodType;
  onCancel: () => void;
  onEdit: (id: string, form: EditFoodType) => Promise<void>;
}) {
  const [editFoodType, setEditFoodType] = React.useState<EditFoodType>({
    name: foodType.name,
    category: foodType.category,
  });
  const [isSaving, saving] = React.useState(false);

  const addFoodType = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    saving(true);
    await onEdit(id, editFoodType);
    saving(false);
  };

  return (
    <div className="card-flat flex flex-col gap-4 p-4">
      <h2 className="text-xl font-semibold text-(--text-h)">Edit food type</h2>
      <form onSubmit={addFoodType} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label
              className="text-sm font-medium text-(--text-h)"
              htmlFor="foodTypeName"
            >
              Food Name
            </label>
            <input
              id="foodTypeName"
              className="w-full text-input"
              placeholder="e.g. Tomato"
              value={editFoodType.name}
              onChange={(e) =>
                setEditFoodType({
                  ...editFoodType,
                  name: e.target.value,
                })
              }
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              className="text-sm font-medium text-(--text-h)"
              htmlFor="foodCategory"
            >
              Category
            </label>
            <select
              id="foodCategory"
              className="w-full dropdown"
              value={editFoodType.category}
              onChange={(e) =>
                setEditFoodType({
                  ...editFoodType,
                  category: e.target.value as FoodCategory,
                })
              }
            >
              {FOOD_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {titleCase(category)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-row gap-3 pt-2">
          <button type="submit" disabled={isSaving} className="btn">
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
