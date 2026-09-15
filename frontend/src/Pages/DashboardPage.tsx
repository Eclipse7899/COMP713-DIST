import * as React from 'react';
import { useEffect, useState } from 'react';
import { DetailedError, hc, parseResponse } from 'hono/client';
import type { AppType } from '@stocked/backend/src';
import { clearJwt, getJwt } from '../../util.ts';
import type { InferResponseType } from 'hono';
import { jwtDecode } from 'jwt-decode';
import {
  FoodCategory,
  FoodUnit,
} from '@stocked/backend/src/generated/prisma/enums.ts';
import FoodItemDisplay from '../Components/FoodItemDisplay.tsx';
import { titleCase } from '../util.ts';
import { Navigate } from 'react-router';
import { client } from '../client.ts';

type StockedItem = InferResponseType<typeof client.api.items.$get, 200>[number];

type FoodType = InferResponseType<typeof client.api.food.$get>[number];

export default function DashboardPage() {
  const token = getJwt();

  const client = hc<AppType>('/', {
    headers: {
      Authorization: 'Bearer ' + token,
    },
  });

  const initialForm = {
    foodId: '',
    quantity: '1',
    unit: FoodUnit.ITEM as FoodUnit,
    expiryDate: '',
  };

  const [items, setItems] = useState<StockedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [foodTypes, setFoodTypes] = useState<FoodType[]>([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [addingType, setAddingType] = useState(false);
  const [newFoodType, setNewFoodType] = useState({
    name: '',
    category: FoodCategory.OTHER as FoodCategory,
    unit: FoodUnit.ITEM as FoodUnit,
  });

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

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
    setError('');
    const res = await parseResponse(client.api.items[':id'].$delete({ param: { id } })).catch(
      (e: DetailedError) => {
        console.error(e);
      },
    );
    if (!res) {
      setError('Failed to delete item.');
      return;
    }
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const addFoodType = async (event: React.SubmitEvent<HTMLFormElement>) => {
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
    setForm((current) => ({ ...current, unit: FoodUnit.ITEM }));
    setNewFoodType({
      name: '',
      category: FoodCategory.OTHER,
      unit: FoodUnit.ITEM,
    });
    setAddingType(false);
  };

  useEffect(() => {
    void Promise.all([loadItems(), loadFoodTypes()]);
  }, []);

  if (token) {
    try {
      const decoded = jwtDecode(token);
      if (decoded.exp && decoded.exp < now / 1000) {
        console.error('Token has expired');
        clearJwt();
        return <Navigate to="/login" replace={true} />
      }
    } catch (error) {
      console.error('Invalid token format:', error);
      clearJwt();
      return <Navigate to="/login" replace={true} />
    }
  } else {
    console.log('No JWT token found');
    return <Navigate to="/login" replace={true} />
  }

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
            className="px-4 py-3 rounded-lg border border-(--border) "
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
            className="px-4 py-3 rounded-lg border border-(--border) "
            type="number"
            min="1"
            step="1"
            placeholder="Quantity"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          />
          <select
            className="px-4 py-3 rounded-lg border border-(--border) "
            value={form.unit}
            onChange={(e) => setForm({
              ...form,
              unit: e.target.value as FoodUnit,
            })}
          >
            {Object.values(FoodUnit).map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
          <input
            className="px-4 py-3 rounded-lg border border-(--border) "
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
                  className="p-4 flex flex-col justify-between items-stretch">
                <FoodItemDisplay item={item} onDelete={deleteItem}/>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
