import * as React from 'react';
import { useEffect } from 'react';
import { type DetailedError, parseResponse } from 'hono/client';
import type { FoodItemResp } from '../models';
import { getClient } from '../client';
import FoodItemBox from './FoodItemBox';
import AddFoodItemPage from './AddFoodItemPage';
import ErrorMessage from './ErrorMessage';

export default function FoodItems() {
  const [items, setItems] = React.useState<FoodItemResp[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [addItemModalOpen, setAddItemModalOpen] = React.useState(false);
  const client = React.useMemo(() => getClient(), []);

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

  const deleteItem = async (id: string) => {
    setError('');
    const res = await parseResponse(
      client.api.items[':id'].$delete({ param: { id } }),
    ).catch((e: DetailedError) => {
      console.error(e);
    });
    if (!res) {
      setError('Failed to delete item.');
      return;
    }
    setItems((current) => current.filter((item) => item.id !== id));
  };

  useEffect(() => {
    loadItems();
  }, []);

  if (addItemModalOpen) {
    return (
      <AddFoodItemPage
        onCancel={() => setAddItemModalOpen(false)}
        onDone={() => {
          setAddItemModalOpen(false);
          loadItems();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 items-stretch">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-(--text-h)">Stocked Items</h2>
        <button
          type="button"
          onClick={() => setAddItemModalOpen(true)}
          className="px-4 py-2 rounded-lg bg-(--primary) hover:bg-(--primary-soft) text-white font-medium transition-all active:scale-95 shadow-sm"
        >
          Add Item
        </button>
      </div>

      <ErrorMessage message={error} />

      <div className="rounded-2xl border border-(--border) bg-(--bg) shadow-(--shadow) overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-(--secondary)">Loading stocked items...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-(--secondary)">No stocked items yet. Add one above!</div>
        ) : (
          <ul className="divide-y divide-(--border)">
            {items.map((item) => (
              <li key={item.id} className="p-4 hover:bg-(--secondary)/5 transition-colors">
                <FoodItemBox item={item} onDelete={deleteItem} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}