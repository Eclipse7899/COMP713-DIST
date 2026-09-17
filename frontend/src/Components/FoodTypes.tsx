import * as React from 'react';
import { useEffect } from 'react';
import { type DetailedError, parseResponse } from 'hono/client';
import type { FoodType } from '../models';
import { getClient } from '../client';
import { AddFoodTypePage } from './AddFoodTypePage';
import FoodTypeBox from './FoodTypeBox';
import ErrorMessage from './ErrorMessage';

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
    const res = await parseResponse(
      client.api.food[':id'].$delete({ param: { id } }),
    ).catch((e: DetailedError) => {
      console.error(e);
    });
    if (!res) {
      setError('Failed to delete food type.');
      return;
    }
    setTypes((current) => current.filter((type) => type.id !== id));
  };

  useEffect(() => {
    loadTypes();
  }, []);

  if (addTypeModalOpen) {
    return (
      <AddFoodTypePage
        onCancel={() => setAddTypeModalOpen(false)}
        onDone={() => {
          setAddTypeModalOpen(false);
          loadTypes();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 items-stretch">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-(--text-h)">Food Types</h2>
        <button
          type="button"
          onClick={() => setAddTypeModalOpen(true)}
          className="btn"
        >
          Add Custom Food
        </button>
      </div>

      <ErrorMessage message={error} />

      <div className="rounded-2xl border border-(--border) bg-(--bg) shadow-(--shadow) overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-(--secondary)">Loading food types...</div>
        ) : types.length === 0 ? (
          <div className="p-8 text-center text-(--secondary)">No food types yet. Add one above!</div>
        ) : (
          <ul className="divide-y divide-(--border)">
            {types.map((type) => (
              <li key={type.id} className="p-4 hover:bg-(--secondary)/5 transition-colors">
                <FoodTypeBox foodType={type} onDelete={deleteType} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}