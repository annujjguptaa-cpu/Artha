'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Share2,
  ExternalLink,
  ChevronDown,
  Sparkles,
  ShoppingBag,
  Copy,
  Check,
  Zap,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';
import { triggerCompareApi, OptimizationResult, OptimizedDecision, WorkerMatch } from '@/lib/api';
import { saveToHistory, HistoryItem } from '@/lib/storage';

export default function ResultsPage() {
  const params = useParams();
  const listId = (params.list_id as string) || 'default_list';

  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('Initiating agent scrapers...');
  const [results, setResults] = useState<OptimizationResult | null>(null);
  
  // Custom user overrides for items
  const [itemOverrides, setItemOverrides] = useState<Record<string, WorkerMatch>>({});
  // Confirmed needs_review flags
  const [confirmedReviews, setConfirmedReviews] = useState<Record<string, boolean>>({});

  // UI Modals & State
  const [activeAlternativeItem, setActiveAlternativeItem] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [extensionInstalled, setExtensionInstalled] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSummaryText, setCopiedSummaryText] = useState(false);

  // Animated Count-Up Savings
  const [animatedSavings, setAnimatedSavings] = useState(0);

  // WebSocket & API Fetch
  useEffect(() => {
    let ws: WebSocket | null = null;
    let isSubscribed = true;

    // Check Chrome Extension installation via custom event / window check
    if (typeof window !== 'undefined') {
      const checkExtension = () => {
        if ((window as any).arthaExtensionInstalled || (window as any).__ARTHA_EXTENSION_ACTIVE__) {
          setExtensionInstalled(true);
        }
      };
      checkExtension();
      window.addEventListener('ARTHA_EXTENSION_LOADED', checkExtension);
    }

    // Connect WebSocket if available
    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(`${wsProtocol}//${window.location.host}/ws/compare/${listId}`);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.percent_complete) {
            setProgress(data.percent_complete);
            setProgressMsg(`Checking ${data.completed_items}/${data.total_items} items across Zepto, Blinkit, Instamart...`);
          }
        } catch (e) {
          console.error('Error parsing WS message', e);
        }
      };
    } catch (e) {
      console.warn('WebSocket connection not available, fallback to direct fetch', e);
    }

    // Simulate progress while fetch runs
    let progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressTimer);
          return 95;
        }
        return prev + 15;
      });
    }, 400);

    // Fetch comparison result
    triggerCompareApi(listId)
      .then((data) => {
        if (!isSubscribed) return;
        clearInterval(progressTimer);
        setProgress(100);
        setResults(data);
        setIsLoading(false);

        // Save to History
        const historyItem: HistoryItem = {
          id: data.list_id,
          date: new Date().toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          rawText: data.decisions.map((d) => d.requested_name).join(', '),
          itemCount: data.decisions.length,
          savings: data.savings,
          splitTotal: data.split_cart_total,
          singleTotal: data.best_single_platform_total,
          bestPlatform: data.best_single_platform,
          results: data,
        };
        saveToHistory(historyItem);
      })
      .catch((err) => {
        console.error('Failed to load comparison results', err);
        setIsLoading(false);
      });

    return () => {
      isSubscribed = false;
      if (progressTimer) clearInterval(progressTimer);
      if (ws) ws.close();
    };
  }, [listId]);

  // Animate Savings Count Up when results land
  useEffect(() => {
    if (results && results.savings > 0) {
      let start = 0;
      const end = results.savings;
      const duration = 1200;
      const increment = Math.ceil(end / (duration / 16));

      const timer = setInterval(() => {
        start += increment;
        if (start >= end) {
          setAnimatedSavings(end);
          clearInterval(timer);
        } else {
          setAnimatedSavings(start);
        }
      }, 16);

      return () => clearInterval(timer);
    }
  }, [results]);

  if (isLoading) {
    return (
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-16 flex flex-col items-center justify-center space-y-6 text-center">
        <div className="relative w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-teal-500/20 border-t-teal-400 animate-spin" />
          <ShoppingBag className="w-8 h-8 text-teal-400" />
        </div>
        <div className="space-y-2 max-w-md">
          <h2 className="text-xl font-serif font-bold text-slate-100">Comparing Prices & Ratings...</h2>
          <p className="text-slate-400 text-sm">{progressMsg}</p>
        </div>
        <div className="w-full max-w-md bg-slate-900 rounded-full h-3 p-0.5 border border-slate-800">
          <div
            className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full rounded-full transition-all duration-300 shadow-md shadow-teal-500/50"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs font-mono text-teal-400 font-semibold">{progress}% Completed</span>
      </main>
    );
  }

  if (!results) {
    return (
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-16 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
        <h2 className="text-2xl font-bold font-serif">Comparison Not Found</h2>
        <p className="text-slate-400">Could not retrieve comparison results for ID: {listId}</p>
        <Link href="/" className="inline-block px-4 py-2 rounded-lg bg-teal-500 text-slate-950 font-semibold">
          Return to Home
        </Link>
      </main>
    );
  }

  // Calculate overridden totals
  let activeSplitTotal = 0;
  const processedDecisions = results.decisions.map((decision) => {
    const override = itemOverrides[decision.item_id];
    const activeMatch = override || decision.selected_product;
    const activePlatform = override ? override.platform : decision.selected_platform;
    const activePrice = activeMatch ? activeMatch.price : decision.price;

    activeSplitTotal += activePrice;

    return {
      ...decision,
      activeMatch,
      activePlatform,
      activePrice,
      isOverridden: !!override,
      isConfirmed: confirmedReviews[decision.item_id] || !decision.needs_review,
    };
  });

  const activeSavings = Math.max(0, results.best_single_platform_total - activeSplitTotal);

  // Group items by platform
  const groupedByPlatform: Record<string, typeof processedDecisions> = {
    zepto: [],
    blinkit: [],
    instamart: [],
  };

  processedDecisions.forEach((d) => {
    if (groupedByPlatform[d.activePlatform]) {
      groupedByPlatform[d.activePlatform].push(d);
    } else {
      groupedByPlatform['zepto'].push(d);
    }
  });

  // Check unconfirmed needs_review items
  const unconfirmedCount = processedDecisions.filter((d) => d.needs_review && !d.isConfirmed).length;

  const getPlatformBadge = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'zepto':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">Zepto</span>;
      case 'blinkit':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">Blinkit</span>;
      case 'instamart':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">Swiggy Instamart</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-700 text-slate-300">{platform}</span>;
    }
  };

  const handleShareClick = () => {
    setShowShareModal(true);
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyTextSummary = () => {
    const summaryLines = [
      `🛒 Artha Split-Cart Summary (Saved ₹${activeSavings})`,
      `----------------------------------------`,
      ...processedDecisions.map(
        (d) => `• ${d.requested_name}: ₹${d.activePrice} on ${d.activePlatform.toUpperCase()}`
      ),
      `----------------------------------------`,
      `Total Split Cart: ₹${activeSplitTotal} (vs Single Best: ₹${results.best_single_platform_total})`,
    ].join('\n');

    navigator.clipboard.writeText(summaryLines);
    setCopiedSummaryText(true);
    setTimeout(() => setCopiedSummaryText(false), 2000);
  };

  const handleBuildCartsClick = () => {
    if (extensionInstalled || (typeof window !== 'undefined' && (window as any).__ARTHA_EXTENSION_INSTALLED__)) {
      if (typeof window !== 'undefined') {
        window.postMessage(
          {
            type: 'ARTHA_START_CART_EXECUTION',
            payload: {
              list_id: listId,
              items: processedDecisions.map((d) => ({
                name: d.activeMatch ? d.activeMatch.matched_product : d.requested_name,
                platform: d.activePlatform,
                price: d.activePrice,
              })),
            },
          },
          '*'
        );
      }
      alert('Artha Chrome Extension triggered! Adding items to web carts...');
    } else {
      setShowExtensionModal(true);
    }
  };


  return (
    <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* 1. VISUALLY DOMINANT SAVINGS HEADER BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950/90 via-slate-900 to-teal-950 border border-teal-500/40 p-6 sm:p-10 shadow-2xl shadow-teal-500/10">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              Split-Cart Optimization Ready
            </div>
            <h1 className="text-slate-300 text-base sm:text-lg font-medium">
              Maximum Savings Unlocked Across Platforms
            </h1>
            <div className="flex items-baseline gap-3 pt-1">
              <span className="text-slate-400 text-sm sm:text-base">You Save:</span>
              <span className="text-5xl sm:text-7xl font-extrabold tracking-tight font-serif text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-300 to-teal-100 drop-shadow-md">
                ₹{activeSavings}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleBuildCartsClick}
              className="px-6 py-3.5 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 shadow-lg shadow-teal-500/25 flex items-center justify-center gap-2 text-sm transition-all"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Build My Carts</span>
            </button>

            <button
              onClick={handleShareClick}
              className="px-4 py-3.5 rounded-xl font-semibold bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-teal-500/50 flex items-center justify-center gap-2 text-sm transition-all"
            >
              <Share2 className="w-4 h-4 text-teal-400" />
              <span>Share / Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. SPLIT-CART VS SINGLE-PLATFORM SUMMARY CARD */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Layers className="w-4 h-4 text-teal-400" />
          Price Comparison Summary
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-xl bg-teal-950/40 border border-teal-500/40 relative">
            <div className="text-xs text-teal-300 font-semibold mb-1">Split-Cart (Artha Pick)</div>
            <div className="text-2xl font-bold text-emerald-300">₹{activeSplitTotal}</div>
            <span className="text-[10px] text-emerald-400/90 font-medium">Optimal Combination</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium mb-1">Zepto Single Cart</div>
            <div className="text-xl font-bold text-slate-200">₹{results.single_platform_totals.zepto}</div>
            <span className="text-[10px] text-slate-400">
              +{results.single_platform_totals.zepto - activeSplitTotal > 0 ? `₹${results.single_platform_totals.zepto - activeSplitTotal}` : '₹0'}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium mb-1">Blinkit Single Cart</div>
            <div className="text-xl font-bold text-slate-200">₹{results.single_platform_totals.blinkit}</div>
            <span className="text-[10px] text-slate-400">
              +{results.single_platform_totals.blinkit - activeSplitTotal > 0 ? `₹${results.single_platform_totals.blinkit - activeSplitTotal}` : '₹0'}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium mb-1">Instamart Single Cart</div>
            <div className="text-xl font-bold text-slate-200">₹{results.single_platform_totals.instamart}</div>
            <span className="text-[10px] text-slate-400">
              +{results.single_platform_totals.instamart - activeSplitTotal > 0 ? `₹${results.single_platform_totals.instamart - activeSplitTotal}` : '₹0'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. NEEDS REVIEW ALERT BANNER (If unconfirmed items exist) */}
      {unconfirmedCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/50 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-amber-300">
              {unconfirmedCount} {unconfirmedCount === 1 ? 'Item Needs Review' : 'Items Need Review'}
            </h4>
            <p className="text-xs text-amber-200/80">
              Items flagged with amber borders require your confirmation or alternative selection before final cart execution.
            </p>
          </div>
        </div>
      )}

      {/* 4. ITEMS GROUPED BY PLATFORM */}
      <div className="space-y-8">
        {Object.entries(groupedByPlatform).map(([platform, items]) => {
          if (items.length === 0) return null;

          return (
            <div key={platform} className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold capitalize text-slate-100 font-serif">
                    {platform === 'instamart' ? 'Swiggy Instamart' : platform} Cart
                  </h2>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                    {items.length} {items.length === 1 ? 'item' : 'items'}
                  </span>
                </div>
                <div className="text-sm font-semibold text-slate-300">
                  Subtotal: ₹{items.reduce((acc, curr) => acc + curr.activePrice, 0)}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((item) => {
                  const isNeedsReview = item.needs_review && !item.isConfirmed;

                  return (
                    <div
                      key={item.item_id}
                      className={`relative p-5 rounded-2xl bg-slate-900/90 border transition-all space-y-3 ${
                        isNeedsReview
                          ? 'border-amber-500/80 ring-1 ring-amber-500/40 shadow-lg shadow-amber-500/10'
                          : item.isOverridden
                          ? 'border-teal-500/60 bg-teal-950/20'
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Top Badges */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <span className="text-xs font-semibold text-slate-400 block">
                            Requested: {item.requested_name}
                          </span>
                          <h3 className="font-semibold text-slate-100 text-base">
                            {item.activeMatch ? item.activeMatch.matched_product : item.requested_name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {getPlatformBadge(item.activePlatform)}
                        </div>
                      </div>

                      {/* Price and Details */}
                      <div className="flex items-center justify-between text-sm pt-1">
                        <div className="flex items-center gap-3">
                          <span className="text-xl font-bold text-emerald-400">₹{item.activePrice}</span>
                          {item.activeMatch && item.activeMatch.rating && (
                            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                              ★ {item.activeMatch.rating}
                            </span>
                          )}
                        </div>

                        {/* Needs Review Badge / Status */}
                        {isNeedsReview && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                            <AlertTriangle className="w-3 h-3" />
                            Needs Review
                          </span>
                        )}

                        {item.isOverridden && (
                          <span className="text-xs text-teal-400 font-medium">Manually Changed</span>
                        )}
                      </div>

                      {/* Confirm Button for Needs Review */}
                      {isNeedsReview && (
                        <div className="pt-2 flex items-center gap-2">
                          <button
                            onClick={() =>
                              setConfirmedReviews((prev) => ({ ...prev, [item.item_id]: true }))
                            }
                            className="flex-1 py-1.5 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Confirm Match
                          </button>
                        </div>
                      )}

                      {/* Universal Change Affordance Button for EVERY Item */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">
                          {item.alternatives.length} platform alternative matches available
                        </span>
                        <button
                          onClick={() =>
                            setActiveAlternativeItem(
                              activeAlternativeItem === item.item_id ? null : item.item_id
                            )
                          }
                          className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-teal-300 hover:text-teal-200 text-xs font-medium border border-slate-700 flex items-center gap-1 transition-all"
                        >
                          <span>Change Match</span>
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Dropdown / Modal inline for alternative selection */}
                      {activeAlternativeItem === item.item_id && (
                        <div className="p-3 rounded-xl bg-slate-950 border border-teal-500/40 space-y-2 mt-2">
                          <div className="text-xs font-semibold text-slate-300">
                            Select Alternative Match:
                          </div>
                          <div className="space-y-1.5 max-h-48 overflow-y-auto">
                            {item.alternatives.map((alt, aIdx) => (
                              <button
                                key={aIdx}
                                onClick={() => {
                                  setItemOverrides((prev) => ({
                                    ...prev,
                                    [item.item_id]: alt,
                                  }));
                                  setConfirmedReviews((prev) => ({
                                    ...prev,
                                    [item.item_id]: true,
                                  }));
                                  setActiveAlternativeItem(null);
                                }}
                                className={`w-full text-left p-2 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                                  item.activeMatch &&
                                  item.activeMatch.platform === alt.platform &&
                                  item.activeMatch.price === alt.price
                                    ? 'bg-teal-500/10 border-teal-500/50 text-teal-200'
                                    : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                                }`}
                              >
                                <div className="space-y-0.5">
                                  <div className="font-semibold">{alt.matched_product}</div>
                                  <div className="flex items-center gap-2">
                                    {getPlatformBadge(alt.platform)}
                                    {alt.rating && <span className="text-slate-400">★ {alt.rating}</span>}
                                  </div>
                                </div>
                                <span className="font-bold text-emerald-400">₹{alt.price}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* SHARE / EXPORT MODAL */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-serif font-bold text-slate-100 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-teal-400" />
                Share & Export Comparison
              </h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <p className="text-slate-400 text-xs">
              Share your optimized split-cart grocery comparison link or copy text to send via messaging apps.
            </p>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Shareable Link</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={typeof window !== 'undefined' ? window.location.href : ''}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs flex items-center gap-1"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleCopyTextSummary}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  {copiedSummaryText ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">Text Summary Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-teal-400" />
                      <span>Copy formatted summary as text</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowShareModal(false)}
                className="w-full py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHROME EXTENSION INSTALLATION MODAL */}
      {showExtensionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-teal-500/40 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-teal-400" />
                <h3 className="text-lg font-serif font-bold text-slate-100">Artha Extension Required</h3>
              </div>
              <button
                onClick={() => setShowExtensionModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <p className="text-slate-300 text-xs leading-relaxed">
                To automatically build carts across Zepto, Blinkit, and Swiggy Instamart web tabs in 1-click, install the Artha Chrome Extension.
              </p>
              <div className="space-y-1 text-xs text-slate-400">
                <div>1. Open Chrome Extension page (<code className="text-teal-300">chrome://extensions</code>)</div>
                <div>2. Enable <strong>Developer Mode</strong></div>
                <div>3. Click <strong>Load Unpacked</strong> and select the <code className="text-teal-300">/extension</code> directory</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowExtensionModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs"
              >
                Got It
              </button>
              <button
                onClick={() => {
                  setExtensionInstalled(true);
                  setShowExtensionModal(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-teal-500 text-slate-950 font-semibold text-xs"
              >
                Simulate Extension Connected
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
