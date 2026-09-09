'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clipboard, Sparkles, ArrowRight, RefreshCw, Check, AlertCircle, ShoppingCart } from 'lucide-react';
import { parseListApi, triggerCompareApi } from '@/lib/api';

const SAMPLE_LISTS = [
  {
    name: 'Breakfast Staples',
    text: `Amul Taaza Milk 1L - 2 packs\nWhole Wheat Brown Bread 400g\nEggs 6 pack\nNescafé Classic Instant Coffee 50g\nBanana 1 kg`,
  },
  {
    name: 'Weekly Pantry',
    text: `Fortune Rice Bran Oil 1L\nTata Salt 1kg\nAashirvaad Whole Wheat Atta 5kg\nToor Dal 1kg\nDettol Handwash Liquid 250ml`,
  },
  {
    name: 'Evening Snacks',
    text: `Lay's India's Magic Masala 50g\nCoca-Cola Zero Sugar 750ml\nBritannia Good Day Cookies 200g\nDark Fantasy Choco Fills`,
  },
];

export default function HomePage() {
  const router = useRouter();
  const [groceryText, setGroceryText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [copiedState, setCopiedState] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setGroceryText(text);
          setCopiedState(true);
          setTimeout(() => setCopiedState(false), 2000);
        }
      } else {
        alert('Clipboard access not supported by browser. Please paste manually.');
      }
    } catch (err) {
      console.error('Failed to read clipboard', err);
      alert('Clipboard permission denied or unavailable.');
    }
  };

  const handlePresetSelect = (text: string) => {
    setGroceryText(text);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groceryText.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);
    setLoadingStatus('Parsing list with AI agent...');

    try {
      // Step 1: Parse List
      const parsedResponse = await parseListApi(groceryText);
      setLoadingStatus(`Parsed ${parsedResponse.items.length} items. Orchestrating scrapers...`);

      // Step 2: Trigger Comparison
      const listId = parsedResponse.list_id;
      
      // Initiate compare (async background or fallback)
      triggerCompareApi(listId, parsedResponse.items).catch((err) => {
        console.warn('Async compare error handled', err);
      });

      // Step 3: Navigate to /results/[list_id]
      router.push(`/results/${listId}`);
    } catch (err: any) {
      console.error('Submit error:', err);
      setErrorMessage(err.message || 'Failed to connect to comparison server. Please try again.');
      setIsLoading(false);
    }
  };

  const itemCount = groceryText
    .split('\n')
    .filter((line) => line.trim().length > 0).length;

  return (
    <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs sm:text-sm font-medium">
          <Sparkles className="w-4 h-4 text-teal-400 animate-pulse" />
          Multi-Platform AI Price Optimization & Cart Execution
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-serif bg-gradient-to-r from-white via-slate-100 to-teal-300 bg-clip-text text-transparent">
          Compare Prices Across <br className="hidden sm:inline" />
          <span className="text-teal-400">Zepto</span>, <span className="text-yellow-400">Blinkit</span> & <span className="text-orange-400">Swiggy Instamart</span>
        </h1>

        <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
          Paste your grocery list below. Artha’s agents scrape live prices, calculate optimal single vs split-cart savings, and let you fill carts automatically.
        </p>
      </div>

      {/* Main Input Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full filter blur-3xl pointer-events-none" />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-teal-400" />
              Your Grocery List
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">
                {itemCount} {itemCount === 1 ? 'item' : 'items'} detected
              </span>
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-medium border border-slate-700 hover:border-teal-500/50 transition-all"
              >
                {copiedState ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Pasted!</span>
                  </>
                ) : (
                  <>
                    <Clipboard className="w-3.5 h-3.5 text-teal-400" />
                    <span>Paste from Clipboard</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="relative">
            <textarea
              value={groceryText}
              onChange={(e) => setGroceryText(e.target.value)}
              placeholder={`Paste your list here...\n\nExample:\n• Amul Milk 1L - 2 packs\n• Tata Salt 1kg\n• Brown Bread 400g\n• Eggs 6 pack\n• Fortune Oil 1L`}
              rows={8}
              className="w-full bg-slate-950/80 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 rounded-xl p-4 text-slate-100 placeholder-slate-500 text-sm sm:text-base resize-y font-mono focus:outline-none transition-all"
              disabled={isLoading}
            />
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-slate-400 font-medium mr-1">Quick Sample Lists:</span>
            {SAMPLE_LISTS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handlePresetSelect(preset.text)}
                className="px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-teal-300 text-xs border border-slate-700/60 transition-colors"
              >
                + {preset.name}
              </button>
            ))}
          </div>

          {/* Error Message with Retry UI */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-red-300">Network Error</p>
                <p className="text-xs text-red-300/80 mt-1">{errorMessage}</p>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded bg-red-800 hover:bg-red-700 text-white text-xs font-medium transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry Request
                </button>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !groceryText.trim()}
            className="w-full py-4 px-6 rounded-xl font-semibold text-slate-950 bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-300 hover:from-teal-300 hover:to-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 text-base transition-all duration-200"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>{loadingStatus}</span>
              </>
            ) : (
              <>
                <span>Compare Prices Across All Platforms</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Feature Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-1">
          <div className="text-teal-400 font-semibold text-sm">Deterministic Optimizer</div>
          <p className="text-slate-400 text-xs">Evaluates ratings, price differences, and brand rules strictly.</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-1">
          <div className="text-emerald-400 font-semibold text-sm">Split-Cart Savings</div>
          <p className="text-slate-400 text-xs">Calculates maximum savings by splitting order items intelligently.</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-1">
          <div className="text-teal-300 font-semibold text-sm">Chrome Extension Cart Fill</div>
          <p className="text-slate-400 text-xs">Injects items into web carts automatically with 1 click.</p>
        </div>
      </div>
    </main>
  );
}
