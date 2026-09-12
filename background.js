const DEFAULT_RULES = [
  { id: "rule_1m", hours: 0, minutes: 1, sound: "1h.mp3", image: "1h.gif", roast: "1 MINUTE ON CHROME! Look at you starting your doomscroll session!" },
  { id: "rule_2m", hours: 0, minutes: 2, sound: "2h.mp3", image: "2h.gif", roast: "2 MINUTES WASTED! Your focus span is officially cooked!" },
  { id: "rule_1h", hours: 1, minutes: 0, sound: "1h.mp3", image: "1h.gif", roast: "1 HOUR ON CHROME! You promised yourself 'just 5 minutes'. Look at you now!" },
  { id: "rule_2h", hours: 2, minutes: 0, sound: "2h.mp3", image: "2h.gif", roast: "2 HOURS DETECTED! That's a whole movie length of pure unadulterated procrastination!" },
  { id: "rule_6h7m", hours: 6, minutes: 7, sound: "67.mp3", image: "67.gif", roast: "6h 7m. Peak brainrot achieved. Bro is studying the blade." },
  { id: "rule_8h", hours: 8, minutes: 0, sound: "faaa.mp3", image: "faaa.gif", roast: "FAAAA! 8 Hours! Your chair misses you! EMOTIONAL DAMAGE!" }
];

// Initialize default storage on installation
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get(["customRules", "isTracking", "totalSeconds"]);
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

// Setup alarm heartbeat
chrome.alarms.create("trackTime", { periodInMinutes: 1 / 60 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "trackTime") {
    tickTime();
  }
});

// 1-second interval timer
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
  const rules = customRules || DEFAULT_RULES;

  for (let index = 0; index < rules.length; index++) {
    const rule = rules[index];
    const triggerTargetSeconds = (rule.hours * 3600) + (rule.minutes * 60);
    const ruleKey = rule.id || `rule_${rule.hours}h_${rule.minutes}m_${index}`;

    if (totalSeconds >= triggerTargetSeconds && !firedTriggers.includes(ruleKey)) {
      const targetTab = await findMessageableTab();

      if (targetTab?.id) {
        // Mark as fired ONLY when we actually deliver it to a valid tab!
        firedTriggers.push(ruleKey);
        await chrome.storage.local.set({ firedTriggers });

        chrome.tabs.sendMessage(targetTab.id, {
          type: "EXECUTE_ROAST",
          payload: rule
        });
        break;
      }
    }
  }
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