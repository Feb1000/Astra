let timerInterval = null;

const PAUSE_INSULTS = [
  (mins) => `FAAAA! You paused screen time monitoring after only ${mins} minute(s)?! You have the attention span of a goldfish!`,
  (mins) => `PAUSED ALREADY?! Bro couldn't survive ${mins} minutes without digital stimulation. Go touch actual chlorophyll!`,
  (mins) => `EMOTIONAL DAMAGE! Quitting after ${mins} mins? Your dopamine receptors are crying for help.`,
  (mins) => `COWARD DETECTED! Pausing the tracker won't pause your impending life failure, my friend.`,
  (mins) => `FAAAA! Bro hit pause faster than a speedrunner. Goldfish everywhere are offended by your attention span!`,
  (mins) => `NICE TRY! Pausing DoomShame won't un-rot your brain. Step away from the glowing rectangle!`,
  (mins) => `SURRENDER ALREADY?! You lasted ${mins} minutes. Your chair is filing for abandonment.`,
  (mins) => `FAAAA! Pausing after ${mins}m? You have less endurance than a wet paper towel!`
];

const ROAST_1H_INSULTS = [
  "1 HOUR ON CHROME! You promised yourself 'just 5 minutes'. Look at you now!",
  "60 MINUTES WASTED! Congratulations on spending an entire hour staring at pixels!",
  "1 HOUR MARK REACHED! Your to-do list is weeping in the corner!",
  "1 HOUR OF DOOMSCROLLING! Your screen is warm and your productivity is cold!"
];

const ROAST_2H_INSULTS = [
  "2 HOURS DETECTED! That's a whole movie length of pure unadulterated procrastination!",
  "2 FULL HOURS! You could have learned a new language, but you chose brainrot!",
  "120 MINUTES IN THE VOID! Your posture is degrading at record speeds!",
  "2 HOURS OF SHAME! Step away from the computer before your brain completely turns to jelly!"
];

const ROAST_6H_INSULTS = [
  "6 HOURS 7 MINUTES! Bro is studying the blade instead of opening a book.",
  "PEAK BRAINROT UNLOCKED! You've been scrolling so long your ancestors are shaking their heads.",
  "6h 7m OF WASTED EXISTENCE! If doomscrolling was an Olympic sport, you'd get last place for trying this hard.",
  "WARNING: BRAIN LIQUEFACTION! 6 hours online today. Go stare at a brick wall instead.",
  "6h 7m DISTRACTION MARATHON! Your screen is burning into your retinas. Shut it down!"
];

const ROAST_8H_INSULTS = [
  "FAAAA! 8 HOURS! Your chair misses you! Your spine has turned into a question mark!",
  "EMOTIONAL DAMAGE! 8 Full Hours of screen time. Step outside before you turn into a baseline meme.",
  "CRITICAL SCREEN OVERDOSE! 8 Hours detected. Grass is requesting your urgent presence.",
  "8 HOURS OF SHAME! Even AI agents work less hours than your unproductive scrolling spree.",
  "FAAAA! 8 Hours on Chrome today. Your eyes are screaming for mercy!"
];

document.addEventListener("DOMContentLoaded", async () => {
  await refreshTimerUI();

  // Start live ticking timer every second
  timerInterval = setInterval(refreshTimerUI, 1000);

  // Setup options page button
  const optionsBtn = document.getElementById("openOptions");
  if (optionsBtn) {
    optionsBtn.addEventListener("click", () => {
      chrome.runtime.openOptionsPage();
    });
  }

  // Setup reset timer button
  const resetBtn = document.getElementById("resetTimer");
  if (resetBtn) {
    resetBtn.addEventListener("click", async () => {
      if (confirm("Reset active screen time counter back to zero?")) {
        await chrome.storage.local.set({ totalSeconds: 0, firedTriggers: [] });
        await refreshTimerUI();
        showNotice("Timer reset to 00:00:00");
      }
    });
  }

  // Setup popup roast modal close button
  const closeRoastBtn = document.getElementById("closePopupRoast");
  if (closeRoastBtn) {
    closeRoastBtn.addEventListener("click", () => {
      const modal = document.getElementById("popupRoastModal");
      if (modal) modal.style.display = "none";
    });
  }
});

async function refreshTimerUI() {
  const data = await chrome.storage.local.get(["totalSeconds", "isTracking"]);
  const secs = data.totalSeconds || 0;
  const hours = Math.floor(secs / 3600);
  const mins = Math.floor((secs % 3600) / 60);
  const displaySecs = secs % 60;
  
  const formatted = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(displaySecs).padStart(2, '0')}`;
  document.getElementById("timer").textContent = formatted;

  const isTracking = data.isTracking !== false; 
  updateToggleUI(isTracking);
}

// PAUSE MONITORING LOGIC WITH GUARANTEED AMBUSH ROAST
document.getElementById("toggleTracking").addEventListener("click", async () => {
  const data = await chrome.storage.local.get(["isTracking", "totalSeconds"]);
  const newState = data.isTracking === false ? true : false;
  
  await chrome.storage.local.set({ isTracking: newState });
  updateToggleUI(newState);

  // IF USER JUST PAUSED (newState is false): AMBUSH WITH RANDOM MEME ROAST & AMBUSH AUDIO!
  if (newState === false) {
    const totalSeconds = data.totalSeconds || 0;
    const mins = Math.floor(totalSeconds / 60);

    const randomInsultFunc = PAUSE_INSULTS[Math.floor(Math.random() * PAUSE_INSULTS.length)];
    const roastText = randomInsultFunc(mins);

    const ambushRule = {
      sound: "ambush.mp3",
      image: "faaa.gif",
      roast: roastText
    };

    // 1. Play sound immediately in Popup context
    playPopupAudio(ambushRule.sound);

    // 2. Display inline modal overlay in Popup UI
    showPopupRoastModal(ambushRule);

    // 3. Inject full frosted overlay onto current web tab
    fireDemoRoast(ambushRule);
  }
});

function updateToggleUI(isTracking) {
  const btn = document.getElementById("toggleTracking");
  const timer = document.getElementById("timer");
  if (isTracking) {
    btn.textContent = "Pause Monitoring";
    btn.className = "btn-toggle tracking-on";
    timer.classList.remove("paused-timer");
  } else {
    btn.textContent = "Resume Monitoring";
    btn.className = "btn-toggle tracking-off";
    timer.classList.add("paused-timer");
  }
}

function fireDemoRoast(rule) {
  // Always attempt popup audio playback as backup
  playPopupAudio(rule.sound);

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab || !tab.id) return;

    if (!isMessageableTab(tab.url)) {
      showPopupRoastModal(rule);
      return;
    }

    chrome.tabs.sendMessage(tab.id, { type: "EXECUTE_ROAST", payload: rule }, (res) => {
      if (chrome.runtime.lastError) {
        showPopupRoastModal(rule);
      } else {
        hideNotice();
      }
    });
  });
}

function playPopupAudio(soundFile) {
  if (!soundFile) return;
  try {
    const audioUrl = (soundFile.startsWith("data:") || soundFile.startsWith("http")) 
      ? soundFile 
      : chrome.runtime.getURL(`assets/${soundFile}`);
    const audio = new Audio(audioUrl);
    audio.play().catch(err => console.log("Popup audio play blocked:", err));
  } catch (e) {
    console.log("Audio play error in popup:", e);
  }
}

function showPopupRoastModal(rule) {
  const modal = document.getElementById("popupRoastModal");
  const title = document.getElementById("popupRoastTitle");
  const text = document.getElementById("popupRoastText");
  const dismissBtn = document.getElementById("closePopupRoast");

  const DISMISS_LABELS = [
    "I Will Touch Grass",
    "Closing TikTok Now",
    "Un-gluing My Butt",
    "I Accept Emotional Damage",
    "Fine, I Will Go Work",
    "I Yield To Doom Engine"
  ];

  if (modal) {
    if (title) title.textContent = "ROASTED!";
    updatePopupMedia(rule.image);
    if (text) text.textContent = `"${rule.roast}"`;
    if (dismissBtn) dismissBtn.textContent = DISMISS_LABELS[Math.floor(Math.random() * DISMISS_LABELS.length)];
    modal.style.display = "flex";
  }
}

function updatePopupMedia(mediaVal) {
  const container = document.getElementById("popupMediaContainer");
  if (!container) return;

  const mediaUrl = (mediaVal?.startsWith("data:") || mediaVal?.startsWith("http")) 
    ? mediaVal 
    : chrome.runtime.getURL(`assets/${mediaVal || 'faaa.gif'}`);

  const isVideo = mediaVal?.includes("data:video/") || 
                  /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(mediaVal || '');

  const style = "width: 100%; max-height: 125px; object-fit: contain; background: #050811; border-radius: 8px; border: 1px solid #1e293b; margin-bottom: 12px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.8);";

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
  }
}

function hideNotice() {
  const notice = document.getElementById("statusNotice");
  if (notice) {
    notice.style.display = "none";
  }
}

// DEMO TRIGGER BUTTON LISTENERS
const trigger1hBtn = document.getElementById("demoTrigger1h");
if (trigger1hBtn) {
  trigger1hBtn.addEventListener("click", () => {
    const roastText = ROAST_1H_INSULTS[Math.floor(Math.random() * ROAST_1H_INSULTS.length)];
    fireDemoRoast({ sound: "1h.mp3", image: "1h.gif", roast: roastText });
  });
}

const trigger2hBtn = document.getElementById("demoTrigger2h");
if (trigger2hBtn) {
  trigger2hBtn.addEventListener("click", () => {
    const roastText = ROAST_2H_INSULTS[Math.floor(Math.random() * ROAST_2H_INSULTS.length)];
    fireDemoRoast({ sound: "2h.mp3", image: "2h.gif", roast: roastText });
  });
}

document.getElementById("demoTrigger1").addEventListener("click", () => {
  const roastText = ROAST_6H_INSULTS[Math.floor(Math.random() * ROAST_6H_INSULTS.length)];
  fireDemoRoast({ sound: "67.mp3", image: "67.gif", roast: roastText });
});

document.getElementById("demoTrigger2").addEventListener("click", () => {
  const roastText = ROAST_8H_INSULTS[Math.floor(Math.random() * ROAST_8H_INSULTS.length)];
  fireDemoRoast({ sound: "faaa.mp3", image: "faaa.gif", roast: roastText });
});