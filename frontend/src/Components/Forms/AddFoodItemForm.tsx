import * as React from 'react';
import { FoodUnit } from '@stocked/backend/src/generated/prisma/enums.ts';
import type { AddFoodItem, FoodType } from '../../models.ts';
import { type DetailedError, parseResponse } from 'hono/client';
import { getClient } from '../../client.ts';
import { titleCase } from '../../util.ts';
import ErrorMessage from '../ErrorMessage.tsx';

export default function AddFoodItemForm({
  onCancel,
  onDone,
}: {
  onCancel: () => void;
  onDone: () => void;
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
    const res = await parseResponse(client.api.food.$get()).catch(
      (e: DetailedError) => {
        console.error(e);
      },
    );

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
    const res = await parseResponse(
      client.api.items.$post({
        json: {
          foodId: form.foodId,
          quantity: Number(form.quantity),
          unit: form.unit,
          expiryDate: form.expiryDate
            ? new Date(form.expiryDate).toISOString()
            : null,
        },
      }),
    ).catch((e: DetailedError) => {
      console.error(e);
    });

    if (!res) {
      setError('Failed to add item. Please try again.');
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

  return (
    <div className="card flex flex-col gap-6 p-4">
      <h2 className="text-xl font-semibold text-(--text-h)">
        Add stocked item
      </h2>
      <ErrorMessage message={error} />
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-(--text-h)" htmlFor="foodId">
              Food Type
            </label>
            <select
              id="foodId"
              className="w-full dropdown"
              value={form.foodId}
              onChange={(e) => setForm({ ...form, foodId: e.target.value })}
              required
            >
              <option value="">Select food type</option>
              {foodTypes.map((foodType) => (
                <option key={foodType.id} value={foodType.id}>
                  {foodType.name} ({titleCase(foodType.category)})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-(--text-h)" htmlFor="quantity">
              Quantity
            </label>
            <input
              id="quantity"
              className="w-full text-input"
              type="number"
              min="1"
              step="1"
              placeholder="Quantity"
              value={form.quantity}
              onChange={(e) =>
                setForm({
                  ...form,
                  quantity: Number(e.target.value),
                })
              }
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-(--text-h)" htmlFor="unit">
              Unit
            </label>
            <select
              id="unit"
              className="w-full dropdown"
              value={form.unit}
              onChange={(e) =>
                setForm({
                  ...form,
                  unit: e.target.value as FoodUnit,
                })
              }
              required
            >
              {Object.values(FoodUnit).map((unit) => (
                <option key={unit} value={unit}>
                  {titleCase(unit)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-(--text-h)" htmlFor="expiryDate">
              Expiry Date
            </label>
            <input
              id="expiryDate"
              className="w-full text-input"
              type="datetime-local"
              value={form.expiryDate ?? ''}
              onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
            />
          </div>
        </div>

        <div className="flex flex-row gap-3 pt-2">
          <button
            type="submit"
            disabled={isDisabled}
            className="btn"
          >
            {isDisabled ? 'Adding...' : 'Add item'}
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