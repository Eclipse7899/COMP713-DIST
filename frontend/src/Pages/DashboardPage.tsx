import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parseResponse } from 'hono/client';
import FoodItems from '../Components/FoodItems';
import FoodTypes from '../Components/FoodTypes';
import ShareStock from '../Components/ShareStock';
import ErrorMessage from '../Components/ErrorMessage';
import { getClient, getWebSocketClient } from '../client';
import type {
  RealtimeEvent,
  RealtimeListener,
  RealtimeSubscribe,
  SharedInventory,
} from '../models';

type TabType = 'items' | 'food' | 'share';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabType>('items');
  const [selectedSharedStock, setSelectedSharedStock] =
    useState<SharedInventory | null>(null);
  const [sharedStocks, setSharedStocks] = useState<SharedInventory[]>([]);
  const [error, setError] = useState('');

  const client = useMemo(() => getClient(), []);
  const realtimeListeners = useRef(new Set<RealtimeListener>());

  const subscribe = useCallback<RealtimeSubscribe>((listener) => {
    realtimeListeners.current.add(listener);
    return () => {
      realtimeListeners.current.delete(listener);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let socket: WebSocket | null = null;

    getWebSocketClient(client).then((ws) => {
      if (typeof ws === 'string') {
        if (!cancelled) {
          setError(ws);
        }
        return;
      }

      if (cancelled) {
        ws.close();
        return;
      }

      socket = ws;
      ws.onmessage = (event) => {
        const realtimeEvent = JSON.parse(event.data) as RealtimeEvent;

        if (realtimeEvent.type === 'share.created') {
          const sharedStock = realtimeEvent.data;
          setSharedStocks((current) =>
            current.some((stock) => stock.userId === sharedStock.userId)
              ? current
              : [...current, sharedStock],
          );
        } else if (realtimeEvent.type === 'share.deleted') {
          const { userId } = realtimeEvent.data;
          setSharedStocks((current) =>
            current.filter((stock) => stock.userId !== userId),
          );
          setSelectedSharedStock((current) =>
            current?.userId === userId ? null : current,
          );
        }

        for (const listener of realtimeListeners.current) {
          listener(realtimeEvent);
        }
      };
    });

    return () => {
      cancelled = true;
      socket?.close();
    };
  }, [client]);

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

      <ErrorMessage message={error} />

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
                realtime={subscribe}
              />
            </div>
          ) : activeTab === 'items' ? (
            <FoodItems realtime={subscribe} />
          ) : activeTab === 'food' ? (
            <FoodTypes realtime={subscribe} />
          ) : (
            <ShareStock />
          )}
        </div>
      </div>
    </div>
  );
}
