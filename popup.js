/**
 * DOOMSHAME v2.0 - Popup Control Panel Script
 */

let timerInterval = null;

const PAUSE_INSULTS = [
  (mins) => `FAAAA! You paused screen time monitoring after only ${mins} minute(s)?! You have the attention span of a goldfish!`,
  (mins) => `PAUSED ALREADY?! Bro couldn't survive ${mins} minutes without digital stimulation. Go touch actual chlorophyll!`,
  (mins) => `EMOTIONAL DAMAGE! Quitting after ${mins} mins? Your dopamine receptors are crying for help.`,
  (mins) => `COWARD DETECTED! Pausing the tracker won't pause your impending life failure, my friend.`
];

document.addEventListener("DOMContentLoaded", async () => {
  await refreshTimerUI();
  timerInterval = setInterval(refreshTimerUI, 1000);

  const optionsBtn = document.getElementById("openOptions");
  if (optionsBtn) {
    optionsBtn.addEventListener("click", () => {
      chrome.runtime.openOptionsPage();
    });
  }

  const resetBtn = document.getElementById("resetTimer");
  if (resetBtn) {
    resetBtn.addEventListener("click", async () => {
      if (confirm("Reset active screen time counter back to zero?")) {
        await chrome.storage.local.set({ totalSeconds: 0, firedTriggers: [], lastTickTime: Date.now() });
        await refreshTimerUI();
        showNotice("Timer reset to 00:00:00");
      }
    });
  }

  const add30Btn = document.getElementById("add30Secs");
  if (add30Btn) {
    add30Btn.addEventListener("click", async () => {
      const data = await chrome.storage.local.get(["totalSeconds"]);
      const currentSecs = data.totalSeconds || 0;
      await chrome.storage.local.set({ totalSeconds: currentSecs + 30, lastTickTime: Date.now() });
      await refreshTimerUI();
      showNotice("Fast-forwarded +30s!");
    });
  }

  const set55Btn = document.getElementById("set55Secs");
  if (set55Btn) {
    set55Btn.addEventListener("click", async () => {
      await chrome.storage.local.set({ totalSeconds: 55, lastTickTime: Date.now(), firedTriggers: [] });
      await refreshTimerUI();
      showNotice("Set to 55s! (1m roast in 5s!)");
    });
  }

  const closeRoastBtn = document.getElementById("closePopupRoast");
  if (closeRoastBtn) {
    closeRoastBtn.addEventListener("click", () => {
      const modal = document.getElementById("popupRoastModal");
      if (modal) modal.style.display = "none";
    });
  }

  // Toggle tracking button with Coward Ambush listener
  const toggleBtn = document.getElementById("toggleTracking");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", async () => {
      const data = await chrome.storage.local.get(["isTracking", "totalSeconds"]);
      const newState = data.isTracking === false ? true : false;
      
      await chrome.storage.local.set({ isTracking: newState, lastTickTime: Date.now() });
      updateToggleUI(newState);

      if (newState === false) {
        const totalSeconds = data.totalSeconds || 0;
        const mins = Math.floor(totalSeconds / 60);
        const randomInsultFunc = PAUSE_INSULTS[Math.floor(Math.random() * PAUSE_INSULTS.length)];
        const roastText = randomInsultFunc(mins);

        const ambushRule = { sound: "ambush.mp3", image: "faaa.gif", roast: roastText };
        fireDemoRoast(ambushRule);
      }
    });
  }

  // DEMO TRIGGER LISTENERS
  const trigger1hBtn = document.getElementById("demoTrigger1h");
  if (trigger1hBtn) trigger1hBtn.addEventListener("click", () => fireDemoRoast({ sound: "1h.mp3", image: "1h.gif", roast: "1 MINUTE ON CHROME! Look at you starting your doomscroll session!" }));

  const trigger2hBtn = document.getElementById("demoTrigger2h");
  if (trigger2hBtn) trigger2hBtn.addEventListener("click", () => fireDemoRoast({ sound: "2h.mp3", image: "2h.gif", roast: "2 MINUTES WASTED! Your focus span is officially cooked!" }));

  const demo1Btn = document.getElementById("demoTrigger1");
  if (demo1Btn) demo1Btn.addEventListener("click", () => fireDemoRoast({ sound: "67.mp3", image: "67.gif", roast: "6h 7m. Peak brainrot achieved. Bro is studying the blade." }));

  const demo2Btn = document.getElementById("demoTrigger2");
  if (demo2Btn) demo2Btn.addEventListener("click", () => fireDemoRoast({ sound: "faaa.mp3", image: "faaa.gif", roast: "FAAAA! 8 Hours! Your chair misses you! EMOTIONAL DAMAGE!" }));
});

async function refreshTimerUI() {
  const data = await chrome.storage.local.get(["totalSeconds", "isTracking"]);
  const secs = data.totalSeconds || 0;
  const hours = Math.floor(secs / 3600);
  const mins = Math.floor((secs % 3600) / 60);
  const displaySecs = secs % 60;
  
  const formatted = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(displaySecs).padStart(2, '0')}`;
  const timerElem = document.getElementById("timer");
  if (timerElem) timerElem.textContent = formatted;

  const isTracking = data.isTracking !== false; 
  updateToggleUI(isTracking);
}

function updateToggleUI(isTracking) {
  const btn = document.getElementById("toggleTracking");
  const timer = document.getElementById("timer");
  const statusBadge = document.getElementById("statusBadge");

  if (btn && timer) {
    if (isTracking) {
      btn.textContent = "Pause Monitoring";
      btn.className = "btn-toggle tracking-on";
      timer.classList.remove("paused-timer");
      if (statusBadge) {
        statusBadge.textContent = "● MONITORING ACTIVE";
        statusBadge.style.color = "#10b981";
      }
    } else {
      btn.textContent = "Resume Monitoring";
      btn.className = "btn-toggle tracking-off";
      timer.classList.add("paused-timer");
      if (statusBadge) {
        statusBadge.textContent = "PAUSED (COWARD MODE)";
        statusBadge.style.color = "#ef4444";
      }
    }
  }
}

function fireDemoRoast(rule) {
  playPopupAudio(rule.sound);

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab?.id && isMessageableTab(tab.url)) {
      chrome.tabs.sendMessage(tab.id, { type: "EXECUTE_ROAST", payload: rule }, async (res) => {
        if (chrome.runtime.lastError) {
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ["content.js"]
            });
            chrome.tabs.sendMessage(tab.id, { type: "EXECUTE_ROAST", payload: rule }, () => {
              if (chrome.runtime.lastError) {
                showPopupRoastModal(rule);
              }
            });
          } catch (err) {
            showPopupRoastModal(rule);
          }
        }
      });
    } else {
      showPopupRoastModal(rule);
    }
  });
}

function playPopupAudio(soundFile) {
  if (!soundFile) return;
  try {
    const audioUrl = (soundFile.startsWith("data:") || soundFile.startsWith("http")) 
      ? soundFile 
      : chrome.runtime.getURL(`assets/${soundFile}`);
    const audio = new Audio(audioUrl);
    audio.play().catch(err => console.log("Popup audio play prevented:", err));
  } catch (e) {
    console.log("Audio play error in popup:", e);
  }
}

function showPopupRoastModal(rule) {
  const modal = document.getElementById("popupRoastModal");
  const title = document.getElementById("popupRoastTitle");
  const text = document.getElementById("popupRoastText");

  if (modal) {
    if (title) title.textContent = "ROASTED!";
    updatePopupMedia(rule.image);
    if (text) text.textContent = `"${rule.roast}"`;
    modal.style.display = "flex";
  }
}

function updatePopupMedia(mediaVal) {
  const container = document.getElementById("popupMediaContainer");
  if (!container) return;

  const val = (mediaVal || 'faaa.gif').trim();
  const mediaUrl = (val.startsWith("data:") || val.startsWith("http")) ? val : chrome.runtime.getURL(`assets/${val}`);

  const isVideo = val.includes("data:video/") || /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(val);
  const style = "width: 100%; max-height: 125px; object-fit: contain; background: #050811; border-radius: 8px; border: 1px solid #1e293b; margin-bottom: 12px;";

  if (isVideo) {
    container.innerHTML = `<video src="${mediaUrl}" autoplay loop muted playsinline style="${style}"></video>`;
  } else {
    container.innerHTML = `<img src="${mediaUrl}" style="${style}" alt="Meme" />`;
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

function showNotice(msg) {
  const notice = document.getElementById("statusNotice");
  if (notice) {
    notice.textContent = msg;
    notice.style.display = "block";
    setTimeout(() => {
      notice.style.display = "none";
    }, 2500);
  }
}