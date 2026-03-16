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

// Listen for messages from content.js (login complete → close reconnect tab early)
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "loginComplete") {
    chrome.alarms.clear("closeReconnectTab");
    cleanupReconnectTab();
  }
});

// Set up the 2-hour auto-refresh alarm on install/startup
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("autoReconnect", { periodInMinutes: CYCLE_MINUTES });
  chrome.storage.local.remove(["_reconnectTabId", "_reconnectWindowId", "_reconnectCycle"]);
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create("autoReconnect", { periodInMinutes: CYCLE_MINUTES });
  chrome.storage.local.remove(["_reconnectTabId", "_reconnectWindowId", "_reconnectCycle"]);
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

    // Close any leftover tab from a previous reconnect cycle
    if (_reconnectTabId) {
      chrome.tabs.remove(_reconnectTabId).catch(() => {});
      chrome.storage.local.remove("_reconnectTabId");
    }

    // Set reconnect flag so content.js knows to logout+re-login
    chrome.storage.local.set({ _reconnectCycle: true }, () => {
      chrome.windows.getAll({}, (windows) => {
        if (windows && windows.length > 0) {
          chrome.tabs.create(
            { url: PORTAL_URL + "/connect/PortalMain", active: false },
            (tab) => {
              if (chrome.runtime.lastError || !tab) return;
              chrome.storage.local.set({ _reconnectTabId: tab.id });
              // Safety net — close after 2 minutes if content.js doesn't signal completion
              chrome.alarms.create("closeReconnectTab", { delayInMinutes: 2 });
            }
          );
        } else {
          chrome.windows.create(
            { url: PORTAL_URL + "/connect/PortalMain", state: "minimized", focused: false },
            (win) => {
              if (chrome.runtime.lastError || !win || !win.tabs || !win.tabs[0]) return;
              chrome.storage.local.set({ _reconnectTabId: win.tabs[0].id, _reconnectWindowId: win.id });
              chrome.alarms.create("closeReconnectTab", { delayInMinutes: 2 });
            }
          );
        }
      });
    });
  });
}

function cleanupReconnectTab() {
  chrome.storage.local.get(["_reconnectTabId", "_reconnectWindowId"], ({ _reconnectTabId, _reconnectWindowId }) => {
    if (_reconnectWindowId) {
      chrome.windows.remove(_reconnectWindowId).catch(() => {});
      chrome.storage.local.remove(["_reconnectTabId", "_reconnectWindowId", "_reconnectCycle"]);
    } else if (_reconnectTabId) {
      chrome.tabs.remove(_reconnectTabId).catch(() => {});
      chrome.storage.local.remove(["_reconnectTabId", "_reconnectCycle"]);
    }
  });
}
