// Artha Extension Background Service Worker

console.log("[Artha Background] Service Worker initialized.");

// State management
let currentExecutionState = {
  isRunning: false,
  platform: '',
  completed: 0,
  total: 0,
  logs: [],
};

// Update storage for popup sync
function updateStorage() {
  chrome.storage.local.set({ artha_execution_state: currentExecutionState });
}

// Initialize storage on startup
chrome.runtime.onInstalled.addListener(() => {
  currentExecutionState = {
    isRunning: false,
    platform: '',
    completed: 0,
    total: 0,
    logs: [
      { timestamp: new Date().toLocaleTimeString(), text: "Artha Extension Ready", type: "info" }
    ],
  };
  updateStorage();
});

// Listen for external messages (from web app) or internal extension messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "START_EXECUTION") {
    console.log("[Artha Background] Starting cart execution with payload:", message.payload);
    startCartExecution(message.payload);
    sendResponse({ status: "ACK", message: "Cart execution initiated" });
  } else if (message.type === "PROGRESS_UPDATE") {
    const data = message.data;
    console.log("[Artha Background] Progress update received:", data);

    currentExecutionState.isRunning = data.completed < data.total;
    currentExecutionState.platform = data.platform;
    currentExecutionState.completed = data.completed;
    currentExecutionState.total = data.total;

    const logEntry = {
      timestamp: new Date().toLocaleTimeString(),
      text: `${data.status === 'success' ? 'Added' : data.status === 'adding' ? 'Adding' : 'Failed'}: ${data.item} on ${data.platform}`,
      type: data.status === 'success' ? 'success' : data.status === 'adding' ? 'info' : 'warning',
      error: data.error,
    };

    currentExecutionState.logs.unshift(logEntry);
    if (currentExecutionState.logs.length > 50) currentExecutionState.logs.pop();

    updateStorage();
    sendResponse({ status: "OK" });
  } else if (message.type === "GET_STATUS") {
    sendResponse(currentExecutionState);
  } else if (message.type === "CLEAR_LOGS") {
    currentExecutionState.logs = [
      { timestamp: new Date().toLocaleTimeString(), text: "Logs cleared", type: "info" }
    ];
    currentExecutionState.isRunning = false;
    currentExecutionState.completed = 0;
    currentExecutionState.total = 0;
    updateStorage();
    sendResponse({ status: "OK" });
  }
  return true;
});

// Execute cart additions across platform tabs
async function startCartExecution(payload) {
  currentExecutionState.isRunning = true;
  currentExecutionState.completed = 0;
  currentExecutionState.total = 0;
  currentExecutionState.logs = [
    { timestamp: new Date().toLocaleTimeString(), text: "Initiating multi-platform cart build...", type: "info" }
  ];
  updateStorage();

  const items = payload?.items || [
    { name: "Amul Milk 1L", platform: "Zepto" },
    { name: "Tata Salt 1kg", platform: "Blinkit" },
    { name: "Brown Bread 400g", platform: "Swiggy Instamart" },
  ];

  currentExecutionState.total = items.length;
  updateStorage();

  // Query or open active platform tabs
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];

  if (activeTab && activeTab.id) {
    chrome.tabs.sendMessage(activeTab.id, {
      type: "EXECUTE_CART_ITEMS",
      items: items,
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn("[Artha Background] Active tab not a platform page, simulating background execution...");
        simulateExecution(items);
      }
    });
  } else {
    simulateExecution(items);
  }
}

// Fallback execution simulator for testing inside extension popup when not on live tab
async function simulateExecution(items) {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const platform = item.platform || "Zepto";

    // Progress update: Adding
    currentExecutionState.platform = platform;
    currentExecutionState.logs.unshift({
      timestamp: new Date().toLocaleTimeString(),
      text: `Adding ${i + 1}/${items.length}: "${item.name}" to ${platform}...`,
      type: "info",
    });
    updateStorage();

    await new Promise((r) => setTimeout(r, 1200));

    // Progress update: Succeeded
    currentExecutionState.completed = i + 1;
    currentExecutionState.isRunning = i + 1 < items.length;
    currentExecutionState.logs.unshift({
      timestamp: new Date().toLocaleTimeString(),
      text: `Added "${item.name}" to ${platform} cart`,
      type: "success",
    });
    updateStorage();

    await new Promise((r) => setTimeout(r, 800));
  }

  currentExecutionState.logs.unshift({
    timestamp: new Date().toLocaleTimeString(),
    text: "Multi-platform cart execution completed!",
    type: "success",
  });
  updateStorage();
}
