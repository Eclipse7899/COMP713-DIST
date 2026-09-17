import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { type DetailedError, parseResponse } from 'hono/client';
import { FoodCategory } from '@stocked/backend/src/generated/prisma/enums';
import { getClient } from '../client';
import { titleCase } from '../util';
import FoodItemBox from './FoodItemBox';
import AddFoodItemForm from './Forms/AddFoodItemForm.tsx';
import ErrorMessage from './ErrorMessage';
import type { EditFoodItem, FoodType, StockedItem } from '../models.ts';

export default function FoodItems() {
  const [items, setItems] = useState<StockedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addItemModalOpen, setAddItemModalOpen] = useState(false);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('');
  const [sort, setSort] = useState<'asc' | 'desc'>('asc');
  const [expiresBefore, setExpiresBefore] = useState('');

  const client = useMemo(() => getClient(), []);

  const hasActiveFilters = Boolean(
    search.trim() || category || expiresBefore || sort !== 'asc',
  );

  const loadFoodTypes = useCallback(async () => {
    const res = await parseResponse(client.api.food.$get()).catch(
      (e: DetailedError) => {
        console.error(e);
      },
    );

    if (!res) {
      setError('Failed to load food types.');
      return;
    }

    setFoodTypes(res);
  }, [client]);

  const loadItems = useCallback(
    async (
      {
        searchValue = search,
        categoryValue = category,
        sortValue = sort,
        expiresBeforeValue = expiresBefore,
      } = {},
    ) => {
      setLoading(true);
      setError('');

      const query: {
        contains?: string;
        categories?: FoodCategory[];
        sort?: 'asc' | 'desc';
        expiryDate?: string;
      } = {};

      if (searchValue.trim()) {
        query.contains = searchValue.trim();
      }

      if (categoryValue) {
        query.categories = [categoryValue as FoodCategory];
      }

      query.sort = sortValue;

      if (expiresBeforeValue) {
        const date = new Date(`${expiresBeforeValue}T23:59:59.999Z`);
        query.expiryDate = date.toISOString();
      }

      const res = await parseResponse(
        client.api.items.$get({
          query,
        }),
      ).catch((e: DetailedError) => {
        console.error(e);
      });

      if (!res) {
        setError('Failed to load stocked items.');
        setLoading(false);
        return;
      }

      setItems(res);
      setLoading(false);
    },
    [client],
  );

  const clearFilters = useCallback(async () => {
    setCategory('');
    setSort('asc');
    setSearch('');
    setExpiresBefore('');

    await loadItems({
      categoryValue: '',
      sortValue: 'asc',
      searchValue: '',
      expiresBeforeValue: '',
    });
  }, [loadItems]);
  const [foodTypes, setFoodTypes] = useState<FoodType[]>([]);
  const loadItemsOnMount = useCallback(() => {
    loadItems();
    loadFoodTypes();
  }, [loadItems]);

  const filterItems = async () => {
    await loadItems({
      searchValue: search,
      categoryValue: category,
      sortValue: sort,
      expiresBeforeValue: expiresBefore,
    });
  }

  React.useEffect(() => {
    loadItemsOnMount();
  }, [loadItemsOnMount]);

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

  if (addItemModalOpen) {
    return (
      <AddFoodItemForm
        onCancel={() => setAddItemModalOpen(false)}
        onDone={() => {
          setAddItemModalOpen(false);
          loadItems();
        }}
      />
    );
  }

  const editItem = async (id: string, form: EditFoodItem) => {
    const res = await parseResponse(
      client.api.items[':id'].$put({
        param: {
          id
        },
        json: {
          foodId: form.foodId,
          quantity: Number(form.quantity),
          unit: form.unit,
          expiryDate: form.expiryDate
            ? new Date(form.expiryDate).toISOString()
            : null,
        },
      }),
    ).catch((e: DetailedError) => {
      console.error(e);
    });

    if (!res) {
      setError('Failed to edit item.');
      return;
    }
    setItems((current) => current.map((item) => (item.id === id ? res : item)));
  };

  return (
    <div className="flex flex-col gap-4 items-stretch">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-(--text-h)">Stocked Items</h2>
        <button
          type="button"
          onClick={() => setAddItemModalOpen(true)}
          className="btn"
        >
          Add Item
        </button>
      </div>

      <div
        className="rounded-2xl border border-(--border) bg-(--bg) p-4 shadow-(--shadow) space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="search-items"
                   className="text-xs font-semibold uppercase tracking-wider text-(--secondary)">
              Search
            </label>
            <input
              id="search-items"
              type="search"
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-input text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="category-filter"
                   className="text-xs font-semibold uppercase tracking-wider text-(--secondary)">
              Category
            </label>
            <select
              id="category-filter"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="dropdown text-sm"
            >
              <option value="">All Categories</option>
              {Object.values(FoodCategory).map((category) => (
                <option key={category} value={category}>
                  {titleCase(category)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="sort-filter"
                   className="text-xs font-semibold uppercase tracking-wider text-(--secondary)">
              Sort By Expiry
            </label>
            <select
              id="sort-filter"
              value={sort}
              onChange={(e) => setSort(e.target.value as 'asc' | 'desc')}
              className="dropdown text-sm"
            >
              <option value="asc">Earliest Expiry First</option>
              <option value="desc">Latest Expiry First</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="expires-before-filter"
                   className="text-xs font-semibold uppercase tracking-wider text-(--secondary)">
              Expires Before
            </label>
            <input
              id="expires-before-filter"
              type="date"
              value={expiresBefore}
              onChange={(e) => setExpiresBefore(e.target.value)}
              className="text-input text-sm"
            />
          </div>
        </div>
        <div className="flex flex-row gap-4 justify-end items-center">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-medium text-(--primary) hover:underline"
            >
              Clear
            </button>
          )}
          <button type="button" className="btn" onClick={() => filterItems()}>
            Search
          </button>
        </div>
      </div>

      <ErrorMessage message={error} />

      <div className="rounded-2xl border border-(--border) bg-(--bg) shadow-(--shadow) overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-(--secondary)">Loading stocked items...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-(--secondary)">
            {hasActiveFilters ? (
              <div className="space-y-2">
                <p>No stocked items match your filters.</p>
              </div>
            ) : (
              'No stocked items yet. Add one above!'
            )}
          </div>
        ) : (
          <ul className="divide-y divide-(--border)">
            {items.map((item) => (
              <li key={item.id} className="p-4 hover:bg-(--secondary)/5 transition-colors">
                <FoodItemBox item={item} foodTypes={foodTypes} onDelete={deleteItem} onEdit={editItem} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}