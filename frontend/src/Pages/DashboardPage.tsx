import { useState } from 'react';
import FoodItems from '../Components/FoodItems';
import FoodTypes from '../Components/FoodTypes';

type TabType = 'items' | 'food';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabType>('items');

  const tabs: { label: string; value: TabType }[] = [
    { label: 'My Stock', value: 'items' },
    { label: 'My Food Types', value: 'food' },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-(--text-h)">Dashboard</h1>
        <p className="text-(--text)">Manage your food stock and categories in one place.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        <nav className="w-full md:w-56 shrink-0 flex flex-row md:flex-col gap-2 p-1.5 bg-(--bg) border border-(--border) rounded-xl shadow-sm">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
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
        </nav>

        <div className="flex-1 min-w-0 w-full">
          {activeTab === 'items' ? <FoodItems /> : <FoodTypes />}
        </div>
      </div>
    </div>
  );
}
