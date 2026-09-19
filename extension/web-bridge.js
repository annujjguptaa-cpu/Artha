// Web-Bridge Script: Connects Artha Web App to Extension

(function () {
  // 1. Inject global flag into page window context
  const script = document.createElement('script');
  script.textContent = `
    window.__ARTHA_EXTENSION_INSTALLED__ = true;
    window.__ARTHA_EXTENSION_VERSION__ = "1.0.0";
    window.dispatchEvent(new CustomEvent("ARTHA_EXTENSION_LOADED"));
    console.log("[Artha Extension] Web-Bridge injected __ARTHA_EXTENSION_INSTALLED__ into page context.");
  `;
  (document.head || document.documentElement).appendChild(script);
  script.remove();

  // 2. Listen for postMessage calls from Next.js web application
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data && event.data.type === 'ARTHA_START_CART_EXECUTION') {
      console.log('[Artha Extension Bridge] Received start cart execution payload:', event.data.payload);
      chrome.runtime.sendMessage({
        type: 'START_EXECUTION',
        payload: event.data.payload,
      });
    }
  });

  console.log('[Artha Extension] Web bridge content script active on localhost.');
})();
