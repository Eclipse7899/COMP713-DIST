import * as React from 'react';
import { useState } from 'react';
import FoodItems from '../Components/FoodItems.tsx';
import FoodTypes from '../Components/FoodTypes.tsx';

type PageType = 'items' | 'food';

function renderPage(pageType: PageType) {
  switch (pageType) {
    case 'items':
      return <FoodItems/>;
    case 'food':
      return <FoodTypes/>;
    default:
      return <div>Unknown page</div>;
  }
}

export default function DashboardPage() {
  const [page, setPage] = useState<PageType>('items');
  const tabs: { label: string; value: PageType }[] = [
    { label: 'My Stock', value: 'items' },
    { label: 'My Food Types', value: 'food' },
  ];
  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-(--text-h)">Dashboard</h1>
        <p className="text-(--text)">Manage your food in one place.</p>
      </div>
      <div className="flex flex-row gap-4">
        <div className="flex flex-col gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              className={`px-4 py-2 rounded-md ${
                page === tab.value
                  ? 'bg-(--secondary)/40 text-(--text-h)'
                  : 'bg-none text-(--text) hover:bg-(--secondary)/20'
              }`}
              onClick={() => setPage(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div>
          {renderPage(page)}
        </div>
      </div>
    </div>
  );
}
