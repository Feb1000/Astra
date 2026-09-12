const DEFAULT_RULES = [
  { id: "rule_1m", hours: 0, minutes: 1, sound: "1h.mp3", image: "1h.gif", roast: "1 MINUTE ON CHROME! Look at you starting your doomscroll session!" },
  { id: "rule_2m", hours: 0, minutes: 2, sound: "2h.mp3", image: "2h.gif", roast: "2 MINUTES WASTED! Your focus span is officially cooked!" },
  { id: "rule_1h", hours: 1, minutes: 0, sound: "1h.mp3", image: "1h.gif", roast: "1 HOUR ON CHROME! You promised yourself 'just 5 minutes'. Look at you now!" },
  { id: "rule_2h", hours: 2, minutes: 0, sound: "2h.mp3", image: "2h.gif", roast: "2 HOURS DETECTED! That's a whole movie length of pure unadulterated procrastination!" },
  { id: "rule_6h7m", hours: 6, minutes: 7, sound: "67.mp3", image: "67.gif", roast: "6h 7m. Peak brainrot achieved. Bro is studying the blade." },
  { id: "rule_8h", hours: 8, minutes: 0, sound: "faaa.mp3", image: "faaa.gif", roast: "FAAAA! 8 Hours! Your chair misses you! EMOTIONAL DAMAGE!" }
];

async function ensureRulesMigrated() {
  const data = await chrome.storage.local.get(["customRules", "isTracking", "totalSeconds"]);
  let rules = data.customRules || [];
  let modified = false;

  if (rules.length === 0) {
    rules = DEFAULT_RULES;
    modified = true;
  } else {
    for (const defRule of DEFAULT_RULES) {
      if (!rules.some(r => r.id === defRule.id || (r.hours === defRule.hours && r.minutes === defRule.minutes))) {
        rules.unshift(defRule);
        modified = true;
      }
    }
  }

  if (modified) {
    await chrome.storage.local.set({ customRules: rules });
  }

  if (data.isTracking === undefined) {
    await chrome.storage.local.set({ isTracking: true });
  }
  if (data.totalSeconds === undefined) {
    await chrome.storage.local.set({ totalSeconds: 0 });
  }
  await chrome.storage.local.set({ lastTickTime: Date.now() });
}

chrome.runtime.onInstalled.addListener(ensureRulesMigrated);
chrome.runtime.onStartup.addListener(ensureRulesMigrated);
ensureRulesMigrated();

// Heartbeat alarm
chrome.alarms.create("trackTime", { periodInMinutes: 1 / 60 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "trackTime") {
    tickTime();
  }
});

// Event listeners to keep service worker active & timing synchronized
chrome.tabs.onActivated.addListener(tickTime);
chrome.tabs.onUpdated.addListener(tickTime);
chrome.windows.onFocusChanged.addListener(tickTime);
if (chrome.idle?.onStateChanged) {
  chrome.idle.onStateChanged.addListener(tickTime);
}

// 1-second fallback interval
setInterval(tickTime, 1000);

async function tickTime() {
  const data = await chrome.storage.local.get(["totalSeconds", "isTracking", "lastTickTime"]);
  const now = Date.now();

  if (data.isTracking === false) {
    await chrome.storage.local.set({ lastTickTime: now });
    return;
  }

  const last = data.lastTickTime || now;
  const elapsedMs = now - last;

  if (elapsedMs >= 1000) {
    const secsToAdd = Math.floor(elapsedMs / 1000);
    const totalSeconds = (data.totalSeconds || 0) + secsToAdd;
    await chrome.storage.local.set({ totalSeconds, lastTickTime: now });
    checkTriggers(totalSeconds);
  }
}

async function checkTriggers(totalSeconds) {
  const { customRules, firedTriggers = [] } = await chrome.storage.local.get(["customRules", "firedTriggers"]);
  const rules = customRules && customRules.length > 0 ? customRules : DEFAULT_RULES;

  for (let index = 0; index < rules.length; index++) {
    const rule = rules[index];
    const triggerTargetSeconds = (rule.hours * 3600) + (rule.minutes * 60);
    if (triggerTargetSeconds <= 0) continue;

    const ruleKey = rule.id || `rule_${rule.hours}h_${rule.minutes}m_${index}`;

    if (totalSeconds >= triggerTargetSeconds && !firedTriggers.includes(ruleKey)) {
      const targetTab = await findMessageableTab();

      let delivered = false;
      if (targetTab?.id) {
        delivered = await deliverRoastToTab(targetTab, rule);
      }

      // Always show Chrome Desktop Notification as alert fallback
      try {
        chrome.notifications.create(ruleKey + "_" + Date.now(), {
          type: "basic",
          iconUrl: chrome.runtime.getURL("assets/faaa.gif"),
          title: "🔥 DOOMSHAME OVERLAY TRIGGERED 🔥",
          message: rule.roast,
          priority: 2
        });
      } catch (e) {
        console.log("[DoomShame Engine] Notification warning:", e);
      }

      firedTriggers.push(ruleKey);
      await chrome.storage.local.set({ firedTriggers });
      break;
    }
  }
}

function deliverRoastToTab(tab, rule) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tab.id, { type: "EXECUTE_ROAST", payload: rule }, async (response) => {
      const err = chrome.runtime.lastError;
      if (err) {
        console.log("[DoomShame Engine] sendMessage failed on tab", tab.id, err.message, "Injecting content.js...");
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["content.js"]
          });
          chrome.tabs.sendMessage(tab.id, { type: "EXECUTE_ROAST", payload: rule }, (res) => {
            const retryErr = chrome.runtime.lastError;
            if (retryErr) {
              console.warn("[DoomShame Engine] Retry sendMessage failed:", retryErr.message);
              resolve(false);
            } else {
              resolve(true);
            }
          });
        } catch (scriptErr) {
          console.warn("[DoomShame Engine] Script injection failed:", scriptErr.message);
          resolve(false);
        }
      } else {
        resolve(true);
      }
    });
  });
}

async function findMessageableTab() {
  // 1. Active tab in current window
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (activeTab && isMessageableTab(activeTab.url)) return activeTab;

  // 2. Active tab across any open window
  const activeTabs = await chrome.tabs.query({ active: true });
  const messageableActive = activeTabs.find(t => isMessageableTab(t.url));
  if (messageableActive) return messageableActive;

  // 3. Any open http/https tab
  const allTabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });
  if (allTabs && allTabs.length > 0) return allTabs[0];

  return null;
}

function isMessageableTab(url) {
  if (!url) return false;
  return !url.startsWith("chrome://") && 
         !url.startsWith("chrome-extension://") && 
         !url.startsWith("edge://") && 
         !url.startsWith("about:") && 
         !url.includes("chromewebstore");
}