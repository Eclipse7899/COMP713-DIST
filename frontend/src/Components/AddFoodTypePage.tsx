import * as React from 'react';
import { FoodCategory } from '@stocked/backend/src/generated/prisma/enums.ts';
import { type DetailedError, parseResponse } from 'hono/client';
import { getClient } from '../client';
import { titleCase } from '../util';
import ErrorMessage from './ErrorMessage';

export function AddFoodTypePage({
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
    <div className="rounded-2xl border border-(--border) bg-(--bg) p-6 shadow-(--shadow) space-y-4">
      <h2 className="text-xl font-semibold text-(--text-h)">Add food type</h2>

      <ErrorMessage message={error} />

      <form onSubmit={addFoodType} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 text-left">
            <label className="text-sm font-medium text-(--text-h)" htmlFor="foodTypeName">
              Food Name
            </label>
            <input
              id="foodTypeName"
              className="w-full px-4 py-2.5 bg-(--bg) text-(--text-h) border border-(--border) rounded-lg focus:outline-none focus:ring-2 focus:ring-(--primary) transition-all placeholder:text-(--secondary)"
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

          <div className="space-y-1.5 text-left">
            <label className="text-sm font-medium text-(--text-h)" htmlFor="foodCategory">
              Category
            </label>
            <select
              id="foodCategory"
              className="w-full px-4 py-2.5 bg-(--bg) text-(--text-h) border border-(--border) rounded-lg focus:outline-none focus:ring-2 focus:ring-(--primary) transition-all"
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
            className="px-5 py-2.5 rounded-lg bg-(--primary) hover:bg-(--primary-soft) text-white font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {addingType ? 'Adding...' : 'Add food type'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-lg border border-(--border) hover:bg-(--secondary)/10 text-(--text-h) font-semibold transition-all active:scale-95 shadow-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}