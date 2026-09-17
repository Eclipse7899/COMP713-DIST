import FoodItemBox from './FoodItemBox.tsx';
import * as React from 'react';
import { useEffect } from 'react';
import { type DetailedError, parseResponse } from 'hono/client';
import type { FoodItemResp } from '../models.ts';
import { getClient } from '../client.ts';
import AddFoodItemPage from './AddFoodItemPage.tsx';

export default function FoodItems() {
  const [items, setItems] = React.useState<FoodItemResp[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [addItemModalOpen, setAddItemModalOpen] = React.useState(false);
  const client = React.useMemo(() => getClient(), []);
  useEffect(() => {
    loadItems();
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
  return (
    <div>
      {(addItemModalOpen) ? (
        <div>
          <AddFoodItemPage
            onCancel={() => setAddItemModalOpen(false)}
            onDone={
              () => {
                setAddItemModalOpen(false);
                loadItems();
              }
            }/>
        </div>
      ) : (
        <div className="flex flex-col gap-4 items-stretch">
          <button
            className="px-4 py-2 rounded-lg bg-(--primary) hover:bg-(--primary)/90 text-(--text-h)"
            onClick={() => setAddItemModalOpen(true)}>
            Add Item
          </button>
          <div className="rounded-2xl border border-(--border)">
            {loading ? (
              <div className="p-6">Loading stocked items...</div>
            ) : items.length === 0 ? (
              <div className="p-6">No stocked items yet.</div>
            ) : (
              <ul className="divide-y divide-(--border)">
                {items.map((item) => (
                  <li key={item.id}
                      className="p-4 flex flex-col justify-between items-stretch">
                    <FoodItemBox item={item} onDelete={deleteItem}/>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {error && <div className="text-red-500">{error}</div>}
        </div>
      )}
    </div>
  );
}