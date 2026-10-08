import * as React from 'react';
import { useCallback, useEffect } from 'react';
import { parseResponse } from 'hono/client';
import type { EditFoodType, FoodType } from '../models';
import { getClient, getWebSocketClient } from '../client';
import { AddFoodTypeForm } from './Forms/AddFoodTypeForm.tsx';
import FoodTypeBox from './FoodTypeBox';
import ErrorMessage from './ErrorMessage';
import { getApiErrorMessage } from '../apiError';

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
      (error: unknown) => {
        setError(getApiErrorMessage(error, 'load food types'));
      },
    );
    if (!res) {
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
    ).catch((error: unknown) => {
      setError(getApiErrorMessage(error, 'delete food type'));
    });
    if (!res) {
      return;
    }
    setTypes((current) => current.filter((type) => type.id !== id));
  };

  const connectWs = useCallback(async () => {
    getWebSocketClient(client).then((ws) => {
      if (ws instanceof WebSocket) {
        ws.onmessage = (event) => {
          const raw = JSON.parse(event.data)
          const type = raw.type
          const data = raw.data

          if (type === 'food.created') {
            setTypes((current) => [...current, data])
          } else if (type === 'food.updated') {
            setTypes((current) => current.map((type) => type.id === data.id ? data : type))
          } else if (type === 'food.deleted') {
            setTypes((current) => current.filter((type) => type.id !== data.id))
          }

        };
      }
      if (typeof ws === 'string') {
        setError(ws);
        return;
      }
    });
  }, []);

  const editType = async (id: string, form: EditFoodType) => {
    setError('');
    const res = await parseResponse(
      client.api.food[':id'].$put({ param: { id }, json: form }),
    ).catch((error: unknown) => {
      setError(getApiErrorMessage(error, 'update food type'));
    });
    if (!res) {
      return;
    }
  };

  useEffect(() => {
    loadTypes();
    connectWs();
  }, []);

  if (addTypeModalOpen) {
    return (
      <AddFoodTypeForm
        onCancel={() => setAddTypeModalOpen(false)}
        onDone={() => {
          setAddTypeModalOpen(false);
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

      <ErrorMessage message={error}/>

      <div className="card">
        {loading ? (
          <div className="p-8 text-center text-(--secondary)">Loading food
            types...</div>
        ) : types.length === 0 ? (
          <div className="p-8 text-center text-(--secondary)">No food types yet.
            Add one above!</div>
        ) : (
          <ul className="divide-y divide-(--border)">
            {types.map((type) => (
              <li key={type.id}
                  className="p-4 hover:bg-(--secondary)/5 transition-colors">
                <FoodTypeBox foodType={type} onDelete={deleteType}
                             onEdit={editType}/>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}