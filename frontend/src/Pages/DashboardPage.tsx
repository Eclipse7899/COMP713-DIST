import * as React from 'react';
import { useEffect, useState } from 'react';
import { DetailedError, hc, parseResponse } from 'hono/client';
import type { AppType } from '@stocked/backend/src';
import { getJwt } from '../../util.ts';
import type { InferResponseType } from 'hono';
import type {
  FoodCategory,
  FoodUnit,
} from '@stocked/backend/src/generated/prisma/enums.ts';

const client = hc<AppType>('/', {
  headers: {
    Authorization: 'Bearer ' + getJwt(),
  },
});

type StockedItem = InferResponseType<typeof client.api.items.$get, 200>[number];

type FoodType = InferResponseType<typeof client.api.food.$get>[number];

const initialForm = {
  foodId: '',
  quantity: '1',
  unit: 'ITEM' as FoodUnit,
  expiryDate: '',
};

export default function DashboardPage() {
  const [items, setItems] = useState<StockedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [form, setForm] = useState(initialForm);
  const [foodTypes, setFoodTypes] = useState<FoodType[]>([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [addingType, setAddingType] = useState(false);
  const [newFoodType, setNewFoodType] = useState({
    name: '',
    category: 'OTHER' as FoodCategory,
  });

  const loadItems = async () => {
    setLoading(true);
    setError('');
    const res = await parseResponse(client.api.items.$get()).catch(
      (e: DetailedError) => {
        console.error(e);
      },
    );
    if (!res) {
      setError('Failed to load stocked items.');
      setLoading(false);
      return;
    }
    setItems(res);
    setLoading(false);
  };

  useEffect(() => {
    void Promise.all([loadItems(), loadFoodTypes()]);
  }, []);

  const loadFoodTypes = async () => {
    setTypesLoading(true);
    const res = await parseResponse(client.api.food.$get()).catch((e: DetailedError) => {
      console.error(e);
    });
    if (res) {
      setFoodTypes(res);
    }
    setTypesLoading(false);
  };

  const addItem = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');

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
      setSaving(false);
      return;
    }

    setForm(initialForm);
    await loadItems();
    setSaving(false);
  };

  const deleteItem = async (id: string) => {
    setDeletingId(id);
    setError('');
    const res = await parseResponse(client.api.items[':id'].$delete({ param: { id } })).catch(
      (e: DetailedError) => {
        console.error(e);
      },
    );
    if (!res) {
      setError('Failed to delete item.');
      setDeletingId('');
      return;
    }
    setItems((current) => current.filter((item) => item.id !== id));
    setDeletingId('');
  };

  const addFoodType = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAddingType(true);
    setError('');
    const res = await parseResponse(client.api.food.$post({
      json: {
        name: newFoodType.name.trim(),
        category: newFoodType.category,
      },
    })).catch((e: DetailedError) => {
      console.error(e);
    });
    if (!res) {
      setAddingType(false);
      return;
    }
    setFoodTypes((current) => [...current, res]);
    setForm((current) => ({ ...current, foodId: res.id }));
    setNewFoodType({ name: '', category: 'OTHER' });
    setAddingType(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-(--text-h)">Dashboard</h1>
        <p className="text-(--text)">Manage stocked items in one place.</p>
      </div>

      <form onSubmit={addFoodType}
            className="grid gap-4 p-6 rounded-2xl border border-(--border) bg-(--bg)">
        <h2 className="text-xl font-semibold text-(--text-h)">Add food type</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <input
            className="px-4 py-3 rounded-lg border border-(--border) bg-white"
            placeholder="Food name"
            value={newFoodType.name}
            onChange={(e) => setNewFoodType({
              ...newFoodType,
              name: e.target.value,
            })}
            required
          />
          <select
            className="px-4 py-3 rounded-lg border border-(--border) bg-white"
            value={newFoodType.category}
            onChange={(e) => setNewFoodType({
              ...newFoodType,
              category: e.target.value as FoodCategory,
            })}
          >
            <option>FRUIT</option>
            <option>VEGETABLE</option>
            <option>MEAT</option>
            <option>DAIRY</option>
            <option>GRAINS</option>
            <option>DRINKS</option>
            <option>SNACKS</option>
            <option>SAUCES</option>
            <option>FROZEN</option>
            <option>OTHER</option>
          </select>
          <button
            disabled={addingType}
            className="w-fit px-5 py-3 rounded-lg bg-(--primary) text-white font-semibold disabled:opacity-60"
          >
            {addingType ? 'Adding...' : 'Add food type'}
          </button>
        </div>
      </form>

      <form onSubmit={addItem}
            className="grid gap-4 p-6 rounded-2xl border border-(--border) bg-(--bg)">
        <h2 className="text-xl font-semibold text-(--text-h)">Add stocked
          item</h2>
        <div className="grid md:grid-cols-4 gap-4">
          <select
            className="px-4 py-3 rounded-lg border border-(--border) bg-white"
            value={form.foodId}
            onChange={(e) => setForm({ ...form, foodId: e.target.value })}
            required
            disabled={typesLoading || foodTypes.length === 0}
          >
            <option
              value="">{typesLoading ? 'Loading food types...' : 'Select food type'}</option>
            {foodTypes.map((foodType) => (
              <option key={foodType.id} value={foodType.id}>
                {foodType.name} ({foodType.category})
              </option>
            ))}
          </select>
          <input
            className="px-4 py-3 rounded-lg border border-(--border) bg-white"
            type="number"
            min="1"
            step="1"
            placeholder="Quantity"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          />
          <select
            className="px-4 py-3 rounded-lg border border-(--border) bg-white"
            value={form.unit}
            onChange={(e) => setForm({
              ...form,
              unit: e.target.value as FoodUnit,
            })}
          >
            <option>ITEM</option>
            <option>KG</option>
            <option>G</option>
            <option>L</option>
            <option>ML</option>
            <option>PACK</option>
          </select>
          <input
            className="px-4 py-3 rounded-lg border border-(--border) bg-white"
            type="datetime-local"
            value={form.expiryDate}
            onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
          />
        </div>
        <button
          disabled={saving}
          className="w-fit px-5 py-3 rounded-lg bg-(--primary) text-white font-semibold disabled:opacity-60"
        >
          {saving ? 'Adding...' : 'Add item'}
        </button>
      </form>

      {error ? (
        <div
          className="p-4 rounded-lg bg-red-50 text-red-700 border border-red-200">{error}</div>
      ) : null}

      <div className="rounded-2xl border border-(--border) overflow-hidden">
        {loading ? (
          <div className="p-6">Loading stocked items...</div>
        ) : items.length === 0 ? (
          <div className="p-6">No stocked items yet.</div>
        ) : (
          <ul className="divide-y divide-(--border)">
            {items.map((item) => (
              <li key={item.id}
                  className="p-4 flex items-center justify-between gap-4">
                <div>
                  <div
                    className="font-semibold text-(--text-h)">{item.food.name}</div>
                  <div className="text-sm text-(--text)">
                    {item.quantity} {item.unit} · {item.food.category}
                    {item.expiryDate ? ` · expires ${new Date(item.expiryDate).toLocaleString()}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => deleteItem(item.id)}
                  disabled={deletingId === item.id}
                  className="px-4 py-2 rounded-lg border border-red-200 text-red-700 disabled:opacity-60"
                >
                  {deletingId === item.id ? 'Deleting...' : 'Delete'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
