import * as React from 'react';
import { FoodUnit } from '@stocked/backend/src/generated/prisma/enums.ts';
import type { AddFoodItem, FoodType } from '../models.ts';
import { type DetailedError, parseResponse } from 'hono/client';
import { getClient } from '../client.ts';


export default function AddFoodItemPage({ onCancel, onDone }: {
  onCancel: () => void,
  onDone: () => void
}) {
  const initialFormState: AddFoodItem = {
    foodId: '',
    quantity: 1,
    unit: FoodUnit.ITEM as FoodUnit,
    expiryDate: '',
  };
  const [form, setForm] = React.useState(initialFormState);
  const [isDisabled, setIsDisabled] = React.useState(false);
  const [error, setError] = React.useState('');
  const [foodTypes, setFoodTypes] = React.useState<FoodType[]>([]);
  const client = React.useMemo(() => getClient(), []);

  const loadFoodTypes = async () => {
    const res = await parseResponse(client.api.food.$get()).catch((e: DetailedError) => {
      console.error(e);
    });

    if (!res) {
      setError('Failed to load food types.');
      return;
    }

    setFoodTypes(res);
  };

  const clearForm = () => {
    setForm(initialFormState);
  };

  const addItem = async () => {
    const res = await parseResponse(client.api.items.$post({
      json: {
        foodId: form.foodId,
        quantity: Number(form.quantity),
        unit: form.unit,
        expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : null,
      },
    })).catch((e: DetailedError) => {
      console.error(e);
    });

    if (!res) {
      setError('Failed to add item.');
      return;
    }

    clearForm();
    onDone();
  };

  React.useEffect(() => {
    loadFoodTypes();
  }, []);

  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsDisabled(true);
    await addItem();
    setIsDisabled(false);
  }

  function cancel() {
    onCancel();
  }
  return (
    <div>
      {error && (
        <div
          className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg">
          {error}
        </div>
      )}
      <form onSubmit={submit}
            className="flex flex-col gap-4 p-6 rounded-2xl">
        <h2 className="text-xl font-semibold text-(--text-h)">
          Add stocked item
        </h2>
        <div className="grid md:grid-cols-4 gap-4">
          <select
            className="px-4 py-3 rounded-lg border border-(--border) "
            value={form.foodId}
            onChange={(e) => setForm({ ...form, foodId: e.target.value })}
            required
          >
            <option
              value="">Select food type
            </option>
            {foodTypes.map((foodType) => (
              <option key={foodType.id} value={foodType.id}>
                {foodType.name} ({foodType.category})
              </option>
            ))}
          </select>
          <input
            className="px-4 py-3 rounded-lg border border-(--border) "
            type="number"
            min="1"
            step="1"
            placeholder="Quantity"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
          />
          <select
            className="px-4 py-3 rounded-lg border border-(--border) "
            value={form.unit}
            defaultValue=""
            onChange={(e) => setForm({
              ...form,
              unit: e.target.value as FoodUnit,
            })}
            required
          >
            <option value="">Select unit</option>
            {Object.values(FoodUnit).map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
          <input
            className="px-4 py-3 rounded-lg border border-(--border) "
            type="datetime-local"
            placeholder="Expiry date"
            value={form.expiryDate ? undefined : ''}
            onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
          />
        </div>
        <div className="flex flex-row gap-4">
          <button
            disabled={isDisabled}
            className="w-fit px-5 py-3 rounded-lg bg-(--primary) text-white font-semibold disabled:opacity-60"
          >
            {isDisabled ? 'Adding...' : 'Add item'}
          </button>
          <button
            type="button"
            onClick={cancel}
            className="w-fit px-5 py-3 rounded-lg bg-(--secondary)/60 text-white font-semibold disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}