import * as React from 'react';
import { useEffect, useState } from 'react';
import { titleCase } from '../util';
import type { EditFoodItem, FoodType, StockedItem } from '../models.ts';
import EditFoodItemForm from './Forms/EditFoodItemForm.tsx';

export default function FoodItemBox({
  item,
  foodTypes,
  onDelete,
  onEdit,
}: {
  item: StockedItem;
  foodTypes: FoodType[];
  onDelete: (id: string) => Promise<void>;
  onEdit: (id: string, item: EditFoodItem) => Promise<void>;
}) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [now, setNow] = useState(Date.now());
  const [isEditing, setIsEditing] = useState(false);

  const addedTime = Date.parse(item.addedAt);
  const expiryTime = item.expiryDate ? Date.parse(item.expiryDate) : null;
  const isExpired = expiryTime ? now > expiryTime : false;
  const progressValue =
    expiryTime && expiryTime > addedTime
      ? Math.max(0, Math.min(1, (now - addedTime) / (expiryTime - addedTime)))
      : null;

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  async function handleDelete(id: string) {
    setIsDeleting(true);
    try {
      await onDelete(id);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleEdit(id: string, item: EditFoodItem) {
    setIsEditing(true);
    try {
      await onEdit(id, item);
    } finally {
      setIsEditing(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row items-center justify-between gap-4 py-1">
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <div className="flex flex-col gap-1">
            <div className="font-semibold text-(--text-h) text-base truncate">
              {item.food.name}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-(--text)">
            <span>
              {item.quantity} {item.unit} · {titleCase(item.food.category)}
            </span>
              {isExpired ? (
                <span className="chip bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400">
                Expired
              </span>
              ) : item.expiryDate ? (
                <span className="text-(--secondary)">
                · expires {new Date(item.expiryDate).toLocaleDateString()} {new Date(item.expiryDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              ) : null}
            </div>
          </div>
          {progressValue !== null && (
            <div className="w-full bg-(--border) h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  isExpired
                    ? 'bg-red-500'
                    : progressValue > 0.75
                      ? 'bg-amber-500'
                      : 'bg-(--accent)'
                }`}
                style={{ width: `${Math.min(100, progressValue * 100)}%` }}
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="btn-secondary"
          >
            Edit
          </button>
        </div>
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => handleDelete(item.id)}
            disabled={isDeleting}
            className="btn-danger"        >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
      {(isEditing) && (
        <EditFoodItemForm item={item} foodTypes={foodTypes} onEdit={handleEdit} onCancel={() => setIsEditing(false)} />
      )}
    </div>
  );
}