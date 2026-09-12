const DEFAULT_RULES = [
  { id: "rule_1h", hours: 1, minutes: 0, sound: "1h.mp3", image: "1h.gif", roast: "1 HOUR ON CHROME! You promised yourself 'just 5 minutes'. Look at you now!" },
  { id: "rule_2h", hours: 2, minutes: 0, sound: "2h.mp3", image: "2h.gif", roast: "2 HOURS DETECTED! That's a whole movie length of pure unadulterated procrastination!" },
  { id: "rule_6h7m", hours: 6, minutes: 7, sound: "67.mp3", image: "67.gif", roast: "6h 7m. Peak brainrot achieved. Bro is studying the blade." },
  { id: "rule_8h", hours: 8, minutes: 0, sound: "faaa.mp3", image: "faaa.gif", roast: "FAAAA! 8 Hours! Your chair misses you! EMOTIONAL DAMAGE!" }
];

let isTicking = false;

// Initialize default storage on installation
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get(["customRules", "isTracking", "totalSeconds", "lastTickTime"]);
  if (!data.customRules || data.customRules.length === 0) {
    await chrome.storage.local.set({ customRules: DEFAULT_RULES });
  }
  if (data.isTracking === undefined) {
    await chrome.storage.local.set({ isTracking: true });
  }
  if (data.totalSeconds === undefined) {
    await chrome.storage.local.set({ totalSeconds: 0 });
  }
  await chrome.storage.local.set({ lastTickTime: Date.now() });
});

// Setup alarm heartbeat (wakes service worker reliably)
chrome.alarms.create("trackTime", { periodInMinutes: 1 / 60 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "trackTime") {
    tickTime();
  }
});

// Also tick on active tab change, tab update, or window focus to keep timer snappy
chrome.tabs.onActivated.addListener(() => tickTime());
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "complete") tickTime();
});
chrome.windows.onFocusChanged.addListener(() => tickTime());

// 1-second interval timer while service worker is active
setInterval(tickTime, 1000);

async function tickTime() {
  if (isTicking) return;
  isTicking = true;

  try {
    const data = await chrome.storage.local.get(["totalSeconds", "isTracking", "lastTickTime"]);
    const now = Date.now();

    // If tracking is paused, update lastTickTime to now and stop
    if (data.isTracking === false) {
      await chrome.storage.local.set({ lastTickTime: now });
      return;
    }

    const last = data.lastTickTime || now;
    const elapsedMs = now - last;

    // If at least 1000ms passed, update seconds accurately
    if (elapsedMs >= 1000) {
      const elapsedSecs = Math.floor(elapsedMs / 1000);
      const secsToAdd = Math.min(elapsedSecs, 60);
      const newLastTick = last + (secsToAdd * 1000);

      const totalSeconds = (data.totalSeconds || 0) + secsToAdd;
      await chrome.storage.local.set({ totalSeconds, lastTickTime: newLastTick });
      await checkTriggers(totalSeconds);
    }
  } catch (err) {
    console.log("DoomShame: tickTime error:", err);
  } finally {
    isTicking = false;
  }
}

async function checkTriggers(totalSeconds) {
  const storage = await chrome.storage.local.get(["customRules", "firedTriggers"]);
  const rules = storage.customRules || DEFAULT_RULES;
  let firedTriggers = storage.firedTriggers || [];

  // Sort rules by trigger time ascending
  const sortedRules = [...rules].sort((a, b) => (a.hours * 3600 + a.minutes * 60) - (b.hours * 3600 + b.minutes * 60));

  for (let index = 0; index < sortedRules.length; index++) {
    const rule = sortedRules[index];
    const triggerTargetSeconds = (rule.hours * 3600) + (rule.minutes * 60);
    const ruleKey = rule.id || `rule_${rule.hours}h_${rule.minutes}m_${index}`;

    // If timer was reset or hasn't reached target yet, remove ruleKey from firedTriggers
    if (totalSeconds < triggerTargetSeconds && firedTriggers.includes(ruleKey)) {
      firedTriggers = firedTriggers.filter(k => k !== ruleKey);
      await chrome.storage.local.set({ firedTriggers });
    }

    // If totalSeconds reached target time and this specific trigger hasn't fired yet
    if (totalSeconds >= triggerTargetSeconds && !firedTriggers.includes(ruleKey)) {
      const delivered = await attemptDeliverRoast(rule);
      if (delivered) {
        firedTriggers.push(ruleKey);
        await chrome.storage.local.set({ firedTriggers });
        break;
      } else {
        // Fallback: If user is on an internal tab or no web tab is open, show system notification
        showSystemNotificationFallback(rule);
        firedTriggers.push(ruleKey);
        await chrome.storage.local.set({ firedTriggers });
        break;
      }
    }
  }
}

async function attemptDeliverRoast(rule) {
  // Query active tab in the last focused window
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  let tab = tabs && tabs[0];

  if (!tab || !isMessageableTab(tab.url)) {
    // Search active tabs across all windows
    const allActive = await chrome.tabs.query({ active: true });
    tab = allActive.find(t => isMessageableTab(t.url));
  }

  if (!tab || !isMessageableTab(tab.url)) {
    // Search all open tabs across all windows for any valid webpage
    const allTabs = await chrome.tabs.query({});
    tab = allTabs.find(t => isMessageableTab(t.url));
  }

  if (!tab?.id || !isMessageableTab(tab.url)) {
    return false; // No web tab currently open
  }

  return sendRoastToTabWithAutoInject(tab.id, rule);
}

function sendRoastToTabWithAutoInject(tabId, rule) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, {
      type: "EXECUTE_ROAST",
      payload: rule
    }, async (response) => {
      if (chrome.runtime.lastError) {
        // Message failed because content.js is not injected yet
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ["content.js"]
          });
          // Retry sending message after script injection
          chrome.tabs.sendMessage(tabId, {
            type: "EXECUTE_ROAST",
            payload: rule
          }, (res) => {
            if (chrome.runtime.lastError) {
              console.log("DoomShame: Retry send failed:", chrome.runtime.lastError.message);
              resolve(false);
            } else {
              resolve(true);
            }
          });
        } catch (err) {
          console.log("DoomShame: Dynamic content script injection failed:", err.message);
          resolve(false);
        }
      } else {
        resolve(true);
      }
    });
  });
}

function showSystemNotificationFallback(rule) {
  try {
    chrome.notifications.create(`doomshame_roast_${Date.now()}`, {
      type: "basic",
      iconUrl: "assets/faaa.gif",
      title: "DOOMSHAME: TIME'S UP FOR BROWSING!",
      message: rule.roast || "Your screen time limit has been reached! Touch grass immediately!",
      priority: 2
    });
  } catch (e) {
    console.log("System notification fallback error:", e);
  }
}

function isMessageableTab(url) {
  if (!url) return false;
  return !url.startsWith("chrome://") && 
         !url.startsWith("chrome-extension://") && 
         !url.startsWith("edge://") && 
         !url.startsWith("about:") && 
         !url.includes("chromewebstore");
}