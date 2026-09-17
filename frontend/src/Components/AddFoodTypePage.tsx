import * as React from 'react';
import { FoodCategory } from '@stocked/backend/src/generated/prisma/enums.ts';
import { type DetailedError, parseResponse } from 'hono/client';
import { getClient } from '../client.ts';
import { titleCase } from '../util.ts';

export function AddFoodTypePage({ onCancel, onDone }: {
  onCancel: () => void;
  onDone: () => void
}) {
  const client = React.useMemo(() => getClient(), []);
  const [newFoodType, setNewFoodType] = React.useState({
    name: '',
    category: FoodCategory.VEGETABLE as FoodCategory,
  });
  const [addingType, setAddingType] = React.useState(false);

  const addFoodType = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAddingType(true);
    const res = await parseResponse(client.api.food.$post({
      json: newFoodType,
    })).catch((e: DetailedError) => {
      console.error(e);
    });
    if (!res) {
      alert('Failed to add food type.');
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
    <form onSubmit={addFoodType}
          className="grid gap-4 p-6 rounded-2xl border border-(--border) bg-(--bg)">

      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold text-(--text-h)">Add food type</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <input
            className="px-4 py-3 rounded-lg border border-(--border) "
            placeholder="Food name"
            value={newFoodType.name}
            onChange={(e) => setNewFoodType({
              ...newFoodType,
              name: e.target.value,
            })}
            required
          />
          <select
            className="px-4 py-3 rounded-lg border border-(--border) "
            value={newFoodType.category}
            onChange={(e) => setNewFoodType({
              ...newFoodType,
              category: e.target.value as FoodCategory,
            })}
          >
            {Object.values(FoodCategory).map((category) => (
              <option key={category} value={category}>
                {titleCase(category)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-row gap-4">
          <button
            disabled={addingType}
            className="w-fit px-5 py-3 rounded-lg bg-(--primary) text-white font-semibold disabled:opacity-60"
          >
            {addingType ? 'Adding...' : 'Add food type'}
          </button>
          <button
            onClick={() => onCancel()}
            type="button"
            className="w-fit px-5 py-3 rounded-lg bg-(--secondary)/60 text-white font-semibold disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}