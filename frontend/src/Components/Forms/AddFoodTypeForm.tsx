import * as React from 'react';
import { FoodCategory } from '@stocked/backend/src/generated/prisma/enums.ts';
import { type DetailedError, parseResponse } from 'hono/client';
import { getClient } from '../../client.ts';
import { titleCase } from '../../util.ts';
import ErrorMessage from '../ErrorMessage.tsx';

export function AddFoodTypeForm({
  onCancel,
  onDone,
}: {
  onCancel: () => void;
  onDone: () => void;
}) {
  const client = React.useMemo(() => getClient(), []);
  const [newFoodType, setNewFoodType] = React.useState({
    name: '',
    category: FoodCategory.VEGETABLE as FoodCategory,
  });
  const [addingType, setAddingType] = React.useState(false);
  const [error, setError] = React.useState('');

  const addFoodType = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setAddingType(true);

    const res = await parseResponse(
      client.api.food.$post({
        json: newFoodType,
      }),
    ).catch((e: DetailedError) => {
      console.error(e);
    });

    if (!res) {
      setError('Failed to add food type. Please try again.');
      setAddingType(false);
      return;
    }

    setNewFoodType({
      name: '',
      category: FoodCategory.VEGETABLE,
    });
    setAddingType(false);
    onDone();
  };

  return (
    <div className="card flex flex-col gap-6 p-4">
      <h2 className="text-xl font-semibold text-(--text-h)">Add food type</h2>

      <ErrorMessage message={error} />

      <form onSubmit={addFoodType} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-(--text-h)" htmlFor="foodTypeName">
              Food Name
            </label>
            <input
              id="foodTypeName"
              className="w-full text-input"
              placeholder="e.g. Tomato"
              value={newFoodType.name}
              onChange={(e) =>
                setNewFoodType({
                  ...newFoodType,
                  name: e.target.value,
                })
              }
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-(--text-h)" htmlFor="foodCategory">
              Category
            </label>
            <select
              id="foodCategory"
              className="w-full dropdown"
              value={newFoodType.category}
              onChange={(e) =>
                setNewFoodType({
                  ...newFoodType,
                  category: e.target.value as FoodCategory,
                })
              }
            >
              {Object.values(FoodCategory).map((category) => (
                <option key={category} value={category}>
                  {titleCase(category)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-row gap-3 pt-2">
          <button
            type="submit"
            disabled={addingType}
            className="btn">
            {addingType ? 'Adding...' : 'Add food type'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}