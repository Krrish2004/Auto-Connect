const PORTAL_URL = "https://172.22.2.6";
const CYCLE_MINUTES = 120; // 2 hours

// Inject content script when portal page loads
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url && tab.url.includes("172.22.2.6")) {
    chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"]
    }).catch(() => {});
  }
});

// Set up the 2-hour auto-refresh alarm on install/startup
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("autoReconnect", { periodInMinutes: CYCLE_MINUTES });
  chrome.storage.local.remove("_reconnectTabId"); // Clean stale tab id from previous session
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create("autoReconnect", { periodInMinutes: CYCLE_MINUTES });
  chrome.storage.local.remove("_reconnectTabId"); // Clean stale tab id from previous session
});

// Single alarm listener for all alarms
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "autoReconnect") {
    handleReconnect();
  } else if (alarm.name === "closeReconnectTab") {
    cleanupReconnectTab();
  }
});

function handleReconnect() {
  chrome.storage.local.get(["username", "password", "_reconnectTabId"], ({ username, password, _reconnectTabId }) => {
    if (!username || !password) return;

    // Close any leftover tab from a previous reconnect cycle (prevents orphaned tabs)
    if (_reconnectTabId) {
      chrome.tabs.remove(_reconnectTabId).catch(() => {});
      chrome.storage.local.remove("_reconnectTabId");
    }

    // Only open a tab if a browser window exists (avoid surprise windows on macOS)
    chrome.windows.getAll({}, (windows) => {
      if (!windows || windows.length === 0) return;

      chrome.tabs.create(
        { url: PORTAL_URL + "/logout", active: false },
        (tab) => {
          if (chrome.runtime.lastError || !tab) return;
          chrome.storage.local.set({ _reconnectTabId: tab.id });
          chrome.alarms.create("closeReconnectTab", { delayInMinutes: 0.5 }); // 30 seconds
        }
      );
    });
  });
}

function cleanupReconnectTab() {
  chrome.storage.local.get(["_reconnectTabId"], ({ _reconnectTabId }) => {
    if (!_reconnectTabId) return;
    chrome.tabs.remove(_reconnectTabId).catch(() => {});
    chrome.storage.local.remove("_reconnectTabId");
  });
}
