import { useEffect, useMemo, useState } from 'react';
import { parseResponse } from 'hono/client';
import FoodItems from '../Components/FoodItems';
import FoodTypes from '../Components/FoodTypes';
import ShareStock from '../Components/ShareStock';
import { getClient } from '../client';
import type { SharedInventory } from '../models';

type TabType = 'items' | 'food' | 'share';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabType>('items');
  const [selectedSharedStock, setSelectedSharedStock] =
    useState<SharedInventory | null>(null);
  const [sharedStocks, setSharedStocks] = useState<SharedInventory[]>([]);

  const client = useMemo(() => getClient(), []);

  useEffect(() => {
    let cancelled = false;

    parseResponse(client.api.items['shared-with-me'].$get())
      .then((shares) => {
        if (!cancelled) {
          setSharedStocks(shares);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSharedStocks([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [client]);

  const tabs: { label: string; value: TabType }[] = [
    { label: 'My Stock', value: 'items' },
    { label: 'My Food Types', value: 'food' },
    { label: 'Share', value: 'share' },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-(--text-h)">Dashboard</h1>
        <p className="text-(--text)">
          Manage your food stock, categories, and sharing in one place.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        <nav className="w-full md:w-56 shrink-0 flex flex-col gap-2 p-1.5 bg-(--bg) border border-(--border) rounded-xl shadow-sm">
          <div className="flex flex-row md:flex-col gap-2">
            {tabs.map((tab) => {
              const isActive =
                selectedSharedStock === null && activeTab === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => {
                    setSelectedSharedStock(null);
                    setActiveTab(tab.value);
                  }}
                  className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                    isActive
                      ? 'bg-(--primary) text-white shadow-sm'
                      : 'text-(--text) hover:bg-(--secondary)/10 hover:text-(--text-h)'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {sharedStocks.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-(--border) pt-2">
              <span className="px-4 pt-1 text-xs font-semibold uppercase tracking-wider text-(--secondary)">
                Shared with me
              </span>
              {sharedStocks.map((stock) => {
                const isActive = selectedSharedStock?.userId === stock.userId;
                return (
                  <button
                    key={stock.userId}
                    type="button"
                    onClick={() => setSelectedSharedStock(stock)}
                    className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                      isActive
                        ? 'bg-(--primary) text-white shadow-sm'
                        : 'text-(--text) hover:bg-(--secondary)/10 hover:text-(--text-h)'
                    }`}
                  >
                    {stock.username}&apos;s stock
                  </button>
                );
              })}
            </div>
          )}
        </nav>

        <div className="flex-1 min-w-0 w-full">
          {selectedSharedStock ? (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-bold text-(--text-h)">
                  {selectedSharedStock.username}&apos;s stock
                </h2>
                <p className="text-(--text)">
                  This inventory is shared with you. You can view the items, but
                  only the owner can change them.
                </p>
              </div>
              <FoodItems
                key={selectedSharedStock.userId}
                ownerId={selectedSharedStock.userId}
                readOnly
              />
            </div>
          ) : activeTab === 'items' ? (
            <FoodItems />
          ) : activeTab === 'food' ? (
            <FoodTypes />
          ) : (
            <ShareStock />
          )}
        </div>
      </div>
    </div>
  );
}
