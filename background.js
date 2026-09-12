/**
 * DOOMSHAME v2.0 - Background Service Worker & Sequential Inconvenience Engine
 */

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
    rules = [...DEFAULT_RULES];
    modified = true;
  } else {
    for (const defRule of DEFAULT_RULES) {
      if (!rules.some(r => r.id === defRule.id || (r.hours === defRule.hours && r.minutes === defRule.minutes))) {
        rules.push(defRule);
        modified = true;
      }
    }
  }

  // Ensure rules are stored in strict chronological order
  rules.sort((a, b) => (a.hours * 3600 + a.minutes * 60) - (b.hours * 3600 + b.minutes * 60));

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

// Lifecycle listeners
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
  let rules = customRules && customRules.length > 0 ? customRules : DEFAULT_RULES;

  // Always evaluate rules in strict chronological order by target time ascending
  rules = [...rules].sort((a, b) => (a.hours * 3600 + a.minutes * 60) - (b.hours * 3600 + b.minutes * 60));

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

      // Always create desktop notification alert with order & rule info
      const timeStr = `${String(rule.hours).padStart(2, '0')}:${String(rule.minutes).padStart(2, '0')}:00`;
      try {
        chrome.notifications.create(ruleKey + "_" + Date.now(), {
          type: "basic",
          iconUrl: chrome.runtime.getURL("assets/faaa.gif"),
          title: `🔥 TRIGGER #${index + 1} REACHED (${timeStr}) 🔥`,
          message: rule.roast,
          priority: 2
        });
      } catch (e) {
        console.log("[DoomShame Engine] Notification dispatch warning:", e);
      }

      firedTriggers.push(ruleKey);
      await chrome.storage.local.set({ firedTriggers });
      break; // Only fire one roast per tick in strict order!
    }
  }
}

function deliverRoastToTab(tab, rule) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tab.id, { type: "EXECUTE_ROAST", payload: rule }, async (response) => {
      const err = chrome.runtime.lastError;
      if (err) {
        console.log("[DoomShame Engine] Tab message failed on tab", tab.id, err.message, "Injecting content.js...");
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
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (activeTab && isMessageableTab(activeTab.url)) return activeTab;

  const activeTabs = await chrome.tabs.query({ active: true });
  const messageableActive = activeTabs.find(t => isMessageableTab(t.url));
  if (messageableActive) return messageableActive;

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