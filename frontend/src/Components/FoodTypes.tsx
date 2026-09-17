import * as React from 'react';
import { useEffect } from 'react';
import { type DetailedError, parseResponse } from 'hono/client';
import type { FoodType } from '../models.ts';
import { getClient } from '../client.ts';
import { AddFoodTypePage } from './AddFoodTypePage.tsx';
import FoodTypeBox from './FoodTypeBox.tsx';

export default function FoodTypes() {
  const [types, setTypes] = React.useState<FoodType[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const client = React.useMemo(() => getClient(), []);
  const [addTypeModalOpen, setAddTypeModalOpen] = React.useState(false);

  const loadTypes = async () => {
    setLoading(true);
    setError('');
    const res = await parseResponse(client.api.food.$get()).catch(
      (e: DetailedError) => {
        console.error(e);
      },
    );
    if (!res) {
      setError('Failed to load food types.');
      setLoading(false);
      return;
    }
    setTypes(res);
    setLoading(false);
  };

  const deleteType = async (id: string) => {
    setError('');
    const res = await parseResponse(client.api.food[':id'].$delete({ param: { id } })).catch(
      (e: DetailedError) => {
        console.error(e);
      },
    );
    if (!res) {
      setError('Failed to delete food type.');
      return;
    }
    setTypes((current) => current.filter((type) => type.id !== id));
  };

  useEffect(() => {
    loadTypes();
  }, []);
  return (
    <div>
      {(addTypeModalOpen) ? (
        <div>
          <AddFoodTypePage
            onCancel={() => setAddTypeModalOpen(false)}
            onDone={
              () => {
                setAddTypeModalOpen(false);
                loadTypes();
              }
            }/>
        </div>
      ) : (
        <div>
          <div className="flex flex-col gap-4 items-stretch">
            <button
              onClick={() => setAddTypeModalOpen(true)}
              className="px-4 py-2 rounded-lg bg-(--primary) hover:bg-(--primary)/90 text-(--text-h)">
              Add Custom Food
            </button>
            <div>
              {error && <div className="text-red-500">{error}</div>}
              {loading ? (
                <div className="p-6">Loading food types...</div>
              ) : types.length === 0 ? (
                <div className="p-6">No food types yet.</div>
              ) : (
                <div className="rounded-2xl border border-(--border)">
                  <ul className="divide-y divide-(--border)">
                    {types.map((type) => (
                      <li key={type.id} className="p-4">
                        <FoodTypeBox foodType={type} onDelete={deleteType}/>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}