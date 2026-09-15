import * as React from 'react';
import { useEffect, useState } from 'react';
import { DetailedError, hc, parseResponse } from 'hono/client';
import type { AppType } from '@stocked/backend/src';
import { clearJwt, getJwt } from '../../util.ts';
import { jwtDecode } from 'jwt-decode';
import {
  FoodCategory,
  FoodUnit,
} from '@stocked/backend/src/generated/prisma/enums.ts';
import FoodItemDisplay from '../Components/FoodItemDisplay.tsx';
import { titleCase } from '../util.ts';
import { Navigate } from 'react-router';
import type { FoodType, StockedItem } from '../models.ts';
import AddFoodItemForm from '../Components/AddFoodItemForm.tsx';

export default function DashboardPage() {
  const token = getJwt();

  const client = hc<AppType>('/', {
    headers: {
      Authorization: 'Bearer ' + token,
    },
  });

  const [items, setItems] = useState<StockedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [foodTypes, setFoodTypes] = useState<FoodType[]>([]);
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
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
    const res = await parseResponse(client.api.food.$get()).catch((e: DetailedError) => {
      console.error(e);
    });
    if (res) {
      setFoodTypes(res);
    }
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
      <dialog open={addItemDialogOpen} className="rounded-2xl shadow-lg position-fixed inset-0 m-auto">
        <div className="flex flex-col gap-4">
          <AddFoodItemForm client={client}></AddFoodItemForm>
        </div>
      </dialog>
      <div>
        <h1 className="text-3xl font-bold text-(--text-h)">Dashboard</h1>
        <p className="text-(--text)">Manage stocked items in one place.</p>
        <button
          className="w-fit px-5 py-3 rounded-lg bg-(--primary) text-white font-semibold disabled:opacity-60"
          onClick={() => setAddItemDialogOpen(true)}>
          Add Item
        </button>
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
