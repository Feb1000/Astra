const DEFAULT_RULES = [
  { id: "rule_1h", hours: 1, minutes: 0, sound: "1h.mp3", image: "1h.gif", roast: "1 HOUR ON CHROME! You promised yourself 'just 5 minutes'. Look at you now!" },
  { id: "rule_2h", hours: 2, minutes: 0, sound: "2h.mp3", image: "2h.gif", roast: "2 HOURS DETECTED! That's a whole movie length of pure unadulterated procrastination!" },
  { id: "rule_6h7m", hours: 6, minutes: 7, sound: "67.mp3", image: "67.gif", roast: "6h 7m. Peak brainrot achieved. Bro is studying the blade." },
  { id: "rule_8h", hours: 8, minutes: 0, sound: "faaa.mp3", image: "faaa.gif", roast: "FAAAA! 8 Hours! Your chair misses you! EMOTIONAL DAMAGE!" }
];

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

// Setup alarm heartbeat (wakes service worker)
chrome.alarms.create("trackTime", { periodInMinutes: 1 / 60 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "trackTime") {
    tickTime();
  }
});

// Also tick on active tab change or window focus to keep timer snappy
chrome.tabs.onActivated.addListener(() => tickTime());
chrome.windows.onFocusChanged.addListener(() => tickTime());

// 1-second interval timer while service worker is active
setInterval(tickTime, 1000);

async function tickTime() {
  const data = await chrome.storage.local.get(["totalSeconds", "isTracking", "lastTickTime"]);
  const now = Date.now();

  // If tracking is paused, update lastTickTime to now and stop
  if (data.isTracking === false) {
    await chrome.storage.local.set({ lastTickTime: now });
    return;
  }

  const last = data.lastTickTime || now;
  const elapsedMs = now - last;

  // If at least 1000ms passed, update seconds
  if (elapsedMs >= 1000) {
    const elapsedSecs = Math.floor(elapsedMs / 1000);
    // Cap at max 3 seconds per tick to prevent massive jumps when waking from system sleep
    const secsToAdd = Math.min(elapsedSecs, 3);

    chrome.idle.queryState(30, async (state) => {
      if (state === "active") {
        const totalSeconds = (data.totalSeconds || 0) + secsToAdd;
        await chrome.storage.local.set({ totalSeconds, lastTickTime: now });
        checkTriggers(totalSeconds);
      } else {
        await chrome.storage.local.set({ lastTickTime: now });
      }
    });
  }
}

async function checkTriggers(totalSeconds) {
  const storage = await chrome.storage.local.get(["customRules", "firedTriggers"]);
  const rules = storage.customRules || DEFAULT_RULES;
  const firedTriggers = storage.firedTriggers || [];

  // Sort rules by trigger time ascending
  const sortedRules = [...rules].sort((a, b) => (a.hours * 3600 + a.minutes * 60) - (b.hours * 3600 + b.minutes * 60));

  let newlyFiredRule = null;

  for (let index = 0; index < sortedRules.length; index++) {
    const rule = sortedRules[index];
    const triggerTargetSeconds = (rule.hours * 3600) + (rule.minutes * 60);
    const ruleKey = rule.id || `rule_${rule.hours}h_${rule.minutes}m_${index}`;

    if (totalSeconds >= triggerTargetSeconds && !firedTriggers.includes(ruleKey)) {
      firedTriggers.push(ruleKey);
      newlyFiredRule = rule;
    }
  }

  if (newlyFiredRule) {
    await chrome.storage.local.set({ firedTriggers });

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id && isMessageableTab(tab.url)) {
      chrome.tabs.sendMessage(tab.id, {
        type: "EXECUTE_ROAST",
        payload: newlyFiredRule
      }, () => {
        if (chrome.runtime.lastError) {
          console.log("DoomShame: Could not send roast to tab:", chrome.runtime.lastError.message);
        }
      });
    }
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