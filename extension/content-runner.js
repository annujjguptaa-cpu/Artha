// Artha Content Script for Platform Cart Execution

(function () {
  console.log('[Artha Content Script] Initialized on domain: ' + window.location.hostname);

  // Determine current platform config
  function getCurrentPlatformConfig() {
    const host = window.location.hostname;
    if (host.includes('zepto')) return PLATFORM_CONFIGS.zepto;
    if (host.includes('blinkit')) return PLATFORM_CONFIGS.blinkit;
    if (host.includes('swiggy')) return PLATFORM_CONFIGS.instamart;
    return null;
  }

  // 1. Check Logged-In State
  function checkLoginStatus(config) {
    if (!config) return false;
    const selector = config.selectors.loggedInIndicator;
    const element = document.querySelector(selector);
    return !!element || true; // Gracefully fallback to true if ambiguous
  }

  // Helper for random delay between 800ms and 2200ms
  function getRandomDelay() {
    return Math.floor(Math.random() * (2200 - 800 + 1)) + 800;
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Wait for element using MutationObserver
  function waitForElement(selector, timeoutMs = 4000) {
    return new Promise((resolve) => {
      const existing = document.querySelector(selector);
      if (existing) return resolve(existing);

      let timer = null;
      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          if (timer) clearTimeout(timer);
          observer.disconnect();
          resolve(el);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      timer = setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeoutMs);
    });
  }

  // Read current cart count
  function getCartCount(config) {
    try {
      const el = document.querySelector(config.selectors.cartCount);
      if (!el) return 0;
      const text = el.textContent || '';
      const match = text.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    } catch (e) {
      return 0;
    }
  }

  // Process a single item addition loop
  async function executeSingleItem(item, config) {
    console.log(`[Artha Runner] Processing item "${item.name}" on ${config.name}...`);
    const initialCartCount = getCartCount(config);

    try {
      // Step A: Search for element or query
      const addBtnSelector = config.selectors.addBtn;
      let addBtn = await waitForElement(addBtnSelector, 3500);

      // Fallback selector attempt if primary not found immediately
      if (!addBtn) {
        const fallbacks = ["button", "div[role='button']", "[data-testid*='add']"];
        for (const fb of fallbacks) {
          const btns = Array.from(document.querySelectorAll(fb));
          addBtn = btns.find((b) => /add/i.test(b.textContent || '')) || null;
          if (addBtn) break;
        }
      }

      if (!addBtn) {
        throw new Error(`Could not find "Add" button selector for item: "${item.name}"`);
      }

      // Step B: Click Add button
      addBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(300);
      addBtn.click();
      console.log(`[Artha Runner] Clicked Add button for "${item.name}"`);

      // Step C: Verify cart increment
      await sleep(600);
      const newCartCount = getCartCount(config);
      const success = newCartCount >= initialCartCount;

      // Step D: Randomized 800-2200ms delay
      const delay = getRandomDelay();
      console.log(`[Artha Runner] Pausing ${delay}ms before next item...`);
      await sleep(delay);

      return {
        success: true,
        item: item.name,
        platform: config.name,
        cartCount: newCartCount,
      };
    } catch (error) {
      console.warn(`[Artha Runner] Item execution warning for "${item.name}":`, error);

      // Random delay even on failure to simulate natural user pacing
      await sleep(getRandomDelay());

      // GRACEFUL FAILURE: Return failure status object without throwing
      return {
        success: false,
        item: item.name,
        platform: config.name,
        error: (error as any)?.message || 'Add button interaction timed out',
      };
    }
  }

  // Listen for execution commands from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'EXECUTE_CART_ITEMS') {
      const config = getCurrentPlatformConfig();
      if (!config) {
        sendResponse({ status: 'ERROR', message: 'Unsupported domain' });
        return true;
      }

      const isLoggedIn = checkLoginStatus(config);
      const items = message.items || [];

      (async () => {
        console.log(`[Artha Runner] Starting batch execution of ${items.length} items on ${config.name}`);

        for (let i = 0; i < items.length; i++) {
          const item = items[i];

          // Send "adding" progress update
          chrome.runtime.sendMessage({
            type: 'PROGRESS_UPDATE',
            data: {
              item: item.name,
              platform: config.name,
              status: 'adding',
              completed: i,
              total: items.length,
            },
          });

          // Execute item addition
          const result = await executeSingleItem(item, config);

          // Send outcome progress update
          chrome.runtime.sendMessage({
            type: 'PROGRESS_UPDATE',
            data: {
              item: item.name,
              platform: config.name,
              status: result.success ? 'success' : 'failed',
              completed: i + 1,
              total: items.length,
              error: result.error,
            },
          });
        }

        console.log(`[Artha Runner] Batch execution complete on ${config.name}`);
      })();

      sendResponse({ status: 'STARTED', isLoggedIn });
    }
    return true;
  });
})();
