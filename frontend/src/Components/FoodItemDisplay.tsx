import type { InferResponseType } from 'hono';
import { client } from '../client.ts';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { titleCase } from '../util.ts';

type StockedItem = InferResponseType<typeof client.api.items.$get, 200>[number];


export default function FoodItemDisplay({ item, onDelete }: {
  item: StockedItem,
  onDelete: (id: string) => Promise<void>
}) {

  const [isDeleting, setIsDeleting] = React.useState(false);
  const [now, setNow] = useState(Date.now());

  console.log(item.expiryDate, item.addedAt, now, Date.parse(item.addedAt), item.expiryDate ? Date.parse(item.expiryDate) : null);
  const progressValue = item.expiryDate ? Math.min(1, (now - Date.parse(item.addedAt)) / (Date.parse(item.expiryDate) - Date.parse(item.addedAt))) : null;

  const isExpired = item.expiryDate ? now > Date.parse(item.expiryDate) : false;

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  function deleteItem(id: string) {
    setIsDeleting(true);
    onDelete(id).then(_ => {
      setIsDeleting(false);
    });
  }

  return (
    <div className="flex flex-row gap-4">
      <div className="flex flex-col gap-2 flex-1">
        <div className="flex flex-col gap-1">
          <div
            className="font-semibold text-(--text-h)">{item.food.name}
          </div>
          <div className="flex flex-row gap-2 text-sm text-(--text)">
            <div>
              {item.quantity} {item.unit} · {titleCase(item.food.category)}
            </div>
            {
              isExpired
                ? <div className="text-red-500">Expired</div>
                : <div>{item.expiryDate ? ` · expires ${new Date(item.expiryDate).toLocaleString()}` : '' }</div>
            }
          </div>
        </div>
        {progressValue !== null &&
          <div>
            <div className="w-full h-2 rounded-full bg-orange-500"
                 style={{ width: `${progressValue * 100}%` }}>
            </div>
          </div>
        }
      </div>
      <div className={"flex flex-col gap-2 justify-center"}>
        <button
          type="button"
          onClick={() => deleteItem(item.id)}
          disabled={isDeleting}
          className="px-4 py-2 rounded-lg bg-white text-red-700 dark:bg-red-700 dark:text-white border-0"
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  );
}