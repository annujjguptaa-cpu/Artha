'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { History, TrendingUp, ShoppingBag, ArrowRight, Trash2, Calendar, Layers, Sparkles } from 'lucide-react';
import { getHistory, HistoryItem, calculateAggregateSavings } from '@/lib/storage';

export default function HistoryPage() {
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [aggregate, setAggregate] = useState({ totalSaved: 0, totalLists: 0 });

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    const data = getHistory();
    setHistoryList(data);
    setAggregate(calculateAggregateSavings());
  };

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear your comparison history?')) {
      localStorage.removeItem('artha_comparison_history');
      loadHistory();
    }
  };

  return (
    <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* 1. AGGREGATE SUMMARY HERO BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-950 via-slate-900 to-emerald-950 border border-teal-500/40 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-teal-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-500/30">
              <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
              Cumulative Savings Dashboard
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold font-serif bg-gradient-to-r from-white via-slate-100 to-teal-300 bg-clip-text text-transparent pt-1">
              You&apos;ve saved <span className="text-emerald-400">₹{aggregate.totalSaved}</span>
            </h1>

            <p className="text-slate-300 text-sm">
              Across <strong className="text-teal-300">{aggregate.totalLists}</strong> grocery lists compared this month.
            </p>
          </div>

          {historyList.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-red-950/60 text-slate-400 hover:text-red-300 border border-slate-700/60 hover:border-red-800 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. PAST COMPARISONS LIST */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold font-serif text-slate-100 flex items-center gap-2">
            <History className="w-5 h-5 text-teal-400" />
            Recent Comparisons
          </h2>
          <span className="text-xs text-slate-400 font-medium">
            {historyList.length} {historyList.length === 1 ? 'record' : 'records'}
          </span>
        </div>

        {historyList.length === 0 ? (
          <div className="p-12 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-4">
            <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-slate-300">No Saved Comparisons Yet</h3>
              <p className="text-slate-500 text-xs max-w-sm mx-auto">
                Paste a grocery list on the home page to start saving with Artha’s split-cart optimizer.
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition-colors"
            >
              <span>Compare a Grocery List</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {historyList.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-teal-500/40 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-teal-400" />
                      {item.date}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                      {item.itemCount} {item.itemCount === 1 ? 'item' : 'items'}
                    </span>
                  </div>

                  <p className="text-sm font-medium text-slate-200 line-clamp-1 max-w-md">
                    {item.rawText}
                  </p>

                  <div className="flex items-center gap-3 text-xs text-slate-400 pt-0.5">
                    <span>Split Cart Total: <strong className="text-slate-200">₹{item.splitTotal}</strong></span>
                    <span>•</span>
                    <span>Single Best: <strong className="text-slate-200">₹{item.singleTotal}</strong></span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto border-t sm:border-t-0 border-slate-800/80 pt-3 sm:pt-0">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] uppercase font-bold text-teal-400 tracking-wider block">
                      Saved
                    </span>
                    <span className="text-2xl font-extrabold text-emerald-400 font-serif">
                      ₹{item.savings}
                    </span>
                  </div>

                  <Link
                    href={`/results/${item.id}`}
                    className="px-4 py-2 rounded-xl bg-slate-800 group-hover:bg-teal-500 group-hover:text-slate-950 text-teal-300 font-semibold text-xs flex items-center gap-1.5 transition-all"
                  >
                    <span>View Results</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
