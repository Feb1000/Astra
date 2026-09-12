const defaultRules = [
  { id: "rule_1m", hours: 0, minutes: 1, sound: "1h.mp3", image: "1h.gif", roast: "1 MINUTE ON CHROME! Look at you starting your doomscroll session!" },
  { id: "rule_2m", hours: 0, minutes: 2, sound: "2h.mp3", image: "2h.gif", roast: "2 MINUTES WASTED! Your focus span is officially cooked!" },
  { id: "rule_1h", hours: 1, minutes: 0, sound: "1h.mp3", image: "1h.gif", roast: "1 HOUR ON CHROME! You promised yourself 'just 5 minutes'. Look at you now!" },
  { id: "rule_2h", hours: 2, minutes: 0, sound: "2h.mp3", image: "2h.gif", roast: "2 HOURS DETECTED! That's a whole movie length of pure unadulterated procrastination!" },
  { id: "rule_6h7m", hours: 6, minutes: 7, sound: "67.mp3", image: "67.gif", roast: "6h 7m. Peak brainrot achieved. Bro is studying the blade." },
  { id: "rule_8h", hours: 8, minutes: 0, sound: "faaa.mp3", image: "faaa.gif", roast: "FAAAA! 8 Hours! Your chair misses you! EMOTIONAL DAMAGE!" }
];

document.addEventListener("DOMContentLoaded", async () => {
  const data = await chrome.storage.local.get("customRules");
  let rules = (data.customRules && data.customRules.length > 0) ? [...data.customRules] : [...defaultRules];
  
  // Ensure default 1m and 2m rules are present in rules list
  let updated = false;
  for (const defRule of defaultRules) {
    if (!rules.some(r => r.id === defRule.id || (r.hours === defRule.hours && r.minutes === defRule.minutes))) {
      rules.unshift(defRule);
      updated = true;
    }
  }
  if (updated) {
    await chrome.storage.local.set({ customRules: rules });
  }

  renderRules(rules);

  document.getElementById("addTriggerBtn").addEventListener("click", () => {
    addRuleCard({ 
      id: `rule_custom_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      hours: 0, 
      minutes: 1, 
      sound: "faaa.mp3", 
      image: "faaa.gif", 
      roast: "New custom roast triggered!" 
    }, true);
  });
  
  document.getElementById("saveBtn").addEventListener("click", async () => {
    await saveCurrentRules();
  });

  const resetTimerBtn = document.getElementById("resetTimerBtn");
  if (resetTimerBtn) {
    resetTimerBtn.addEventListener("click", async () => {
      if (confirm("Reset active screen time counter back to zero (00:00:00)?")) {
        await chrome.storage.local.set({ 
          totalSeconds: 0, 
          firedTriggers: [], 
          lastTickTime: Date.now() 
        });
        showToast("Screen time reset to 00:00:00! All triggers active.");
      }
    });
  }

  document.getElementById("resetDefaultsBtn").addEventListener("click", async () => {
    if (confirm("Reset rule engine back to default rules?")) {
      try {
        await chrome.storage.local.set({ 
          customRules: defaultRules, 
          firedTriggers: [],
          totalSeconds: 0,
          lastTickTime: Date.now()
        });
        renderRules(defaultRules);
        showToast("Restored default rules & reset timer!");
      } catch (err) {
        showToast("Error resetting rules: " + err.message);
      }
    }
  });
});

async function saveCurrentRules() {
  const cards = document.querySelectorAll(".card");
  let rules = Array.from(cards).map((card, index) => ({
    id: card.dataset.ruleId || `rule_custom_${Date.now()}_${index}`,
    hours: Math.max(0, parseInt(card.querySelector(".h-input").value) || 0),
    minutes: Math.max(0, Math.min(59, parseInt(card.querySelector(".m-input").value) || 0)),
    sound: card.querySelector(".sound-input").value.trim(),
    image: card.querySelector(".img-input").value.trim(),
    roast: card.querySelector(".roast-input").value.trim()
  }));

  // Sort rules by trigger time ascending
  rules.sort((a, b) => (a.hours * 3600 + a.minutes * 60) - (b.hours * 3600 + b.minutes * 60));

  try {
    // Reset firedTriggers on save so new/updated rules fire immediately!
    await chrome.storage.local.set({ customRules: rules, firedTriggers: [] });
    showToast("Settings saved & triggers activated successfully!");
    renderRules(rules);
  } catch (err) {
    showToast("Error saving rules: " + err.message);
  }
}

function renderRules(rules) {
  const container = document.getElementById("triggerList");
  container.innerHTML = "";
  rules.forEach(rule => addRuleCard(rule, false));
}

function addRuleCard(rule = { hours: 0, minutes: 1, sound: "faaa.mp3", image: "faaa.gif", roast: "New custom roast triggered!" }, shouldScroll = false) {
  const container = document.getElementById("triggerList");
  const card = document.createElement("div");
  card.className = "card";
  const ruleId = rule.id || `rule_custom_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  card.dataset.ruleId = ruleId;

  card.innerHTML = `
    <div><label>Hours</label><input type="number" min="0" max="23" value="${rule.hours}" class="h-input"></div>
    <div><label>Minutes</label><input type="number" min="0" max="59" value="${rule.minutes}" class="m-input"></div>
    <div>
      <label>Audio File / Custom Sound</label>
      <input type="text" value="${escapeAttr(rule.sound)}" class="sound-input" placeholder="faaa.mp3 or Data URL">
      <input type="file" accept="audio/*" class="sound-file-picker" style="margin-top:6px; font-size:11px; color:#94a3b8; width:100%;">
    </div>
    <div>
      <label>Meme Image / GIF / Video</label>
      <input type="text" value="${escapeAttr(rule.image)}" class="img-input" placeholder="faaa.gif or Data URL">
      <input type="file" accept="image/*,video/*" class="img-file-picker" style="margin-top:6px; font-size:11px; color:#94a3b8; width:100%;">
    </div>
    <div style="grid-column: span 2;">
      <label>Media Preview</label>
      <div class="media-preview-box" style="background:#050811; border:1px solid #1e293b; border-radius:8px; padding:6px; height:70px; display:flex; align-items:center; justify-content:center; overflow:hidden;">
        ${renderPreviewHtml(rule.image)}
      </div>
    </div>
    <div style="grid-column: span 2;"><label>Roast Text</label><input type="text" value="${escapeAttr(rule.roast)}" class="roast-input"></div>
    <div class="card-actions">
      <button class="btn-preview">Sound Preview</button>
      <button class="btn-test">Test Trigger</button>
      <button class="btn-danger">Delete Rule</button>
    </div>
  `;
  container.appendChild(card);

  if (shouldScroll) {
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  const imgInput = card.querySelector(".img-input");
  const previewBox = card.querySelector(".media-preview-box");

  imgInput.addEventListener("input", () => {
    previewBox.innerHTML = renderPreviewHtml(imgInput.value.trim());
  });

  card.querySelector(".btn-preview").addEventListener("click", () => {
    const soundVal = card.querySelector(".sound-input").value.trim();
    if (!soundVal) {
      showToast("Please enter an audio filename or select a file first.");
      return;
    }
    const audioUrl = (soundVal.startsWith("data:") || soundVal.startsWith("http")) 
      ? soundVal 
      : chrome.runtime.getURL(`assets/${soundVal || 'faaa.mp3'}`);
    const audio = new Audio(audioUrl);
    audio.play().then(() => {
      showToast("Playing sound preview...");
    }).catch(err => {
      showToast("Audio playback error: " + err.message);
    });
  });

  card.querySelector(".sound-file-picker").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        card.querySelector(".sound-input").value = evt.target.result;
        showToast(`Loaded custom audio file: ${file.name}`);
      };
      reader.readAsDataURL(file);
    }
  });

  card.querySelector(".img-file-picker").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const dataUrl = evt.target.result;
        card.querySelector(".img-input").value = dataUrl;
        previewBox.innerHTML = renderPreviewHtml(dataUrl);
        showToast(`Loaded custom media file: ${file.name}`);
      };
      reader.readAsDataURL(file);
    }
  });

  card.querySelector(".btn-danger").addEventListener("click", async () => {
    card.remove();
    await saveCurrentRules();
  });

  card.querySelector(".btn-test").addEventListener("click", () => {
    const testRule = {
      id: card.dataset.ruleId,
      hours: parseInt(card.querySelector(".h-input").value) || 0,
      minutes: parseInt(card.querySelector(".m-input").value) || 0,
      sound: card.querySelector(".sound-input").value.trim(),
      image: card.querySelector(".img-input").value.trim(),
      roast: card.querySelector(".roast-input").value.trim()
    };
    testRuleInActiveTab(testRule);
  });
}

function getMediaUrl(mediaVal) {
  if (!mediaVal) return chrome.runtime.getURL("assets/faaa.gif");
  let val = mediaVal.trim();
  return (val.startsWith("data:") || val.startsWith("http")) 
    ? val 
    : chrome.runtime.getURL(`assets/${val}`);
}

function renderPreviewHtml(mediaVal) {
  if (!mediaVal) return `<span style="font-size:11px; color:#64748b;">No media loaded</span>`;
  
  const mediaUrl = getMediaUrl(mediaVal);
  const isVideo = mediaVal.includes("data:video/") || 
                  /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(mediaVal);

  if (isVideo) {
    return `<video src="${mediaUrl}" autoplay loop muted playsinline style="max-height:100%; max-width:100%; object-fit:contain; border-radius:4px;"></video>`;
  } else {
    return `<img src="${mediaUrl}" style="max-height:100%; max-width:100%; object-fit:contain; border-radius:4px;" alt="Preview" onerror="this.outerHTML='<span style=\\'font-size:11px; color:#ef4444;\\'>Failed to load preview</span>'"/>`;
  }
}

async function testRuleInActiveTab(rule) {
  // Always display the roast overlay DIRECTLY on the options page so user sees instant feedback
  showLocalRoastOverlay(rule);

  // ALSO attempt sending roast overlay to active web tab if open
  const allActive = await chrome.tabs.query({ active: true });
  const validTab = allActive.find(t => isMessageableTab(t.url));

  if (validTab && validTab.id) {
    chrome.tabs.sendMessage(validTab.id, { type: "EXECUTE_ROAST", payload: rule }, async () => {
      if (chrome.runtime.lastError) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: validTab.id },
            files: ["content.js"]
          });
          chrome.tabs.sendMessage(validTab.id, { type: "EXECUTE_ROAST", payload: rule });
        } catch (e) {
          // Local overlay already displayed
        }
      }
    });
  }
}

function showLocalRoastOverlay(rule) {
  const existingOverlay = document.getElementById("doomshame-overlay");
  if (existingOverlay) existingOverlay.remove();

  if (rule.sound) {
    const audioUrl = (rule.sound.startsWith("data:") || rule.sound.startsWith("http")) 
      ? rule.sound 
      : chrome.runtime.getURL(`assets/${rule.sound}`);
    new Audio(audioUrl).play().catch(e => console.log("Local audio blocked:", e));
  }

  const overlay = document.createElement("div");
  overlay.id = "doomshame-overlay";
  overlay.style.cssText = `
    position: fixed !important; top: 0 !important; left: 0 !important;
    width: 100vw !important; height: 100vh !important;
    background: rgba(5, 8, 17, 0.95) !important;
    backdrop-filter: blur(20px) !important; z-index: 2147483647 !important;
    display: flex !important; flex-direction: column !important;
    align-items: center !important; justify-content: center !important;
    color: #f8fafc !important; font-family: sans-serif !important; padding: 20px !important;
  `;

  const mediaVal = rule.image || 'faaa.gif';
  const mediaUrl = getMediaUrl(mediaVal);
  const isVideo = mediaVal.includes("data:video/") || /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(mediaVal);

  const mediaHtml = isVideo
    ? `<video src="${mediaUrl}" autoplay loop muted playsinline style="width:100%; max-height:220px; object-fit:contain; border-radius:12px; margin-bottom:20px; border:1px solid #1e293b;"></video>`
    : `<img src="${mediaUrl}" style="width:100%; max-height:220px; object-fit:contain; border-radius:12px; margin-bottom:20px; border:1px solid #1e293b;" />`;

  overlay.innerHTML = `
    <div style="background: linear-gradient(145deg, #0b0f19, #121827); border: 2px solid #ff2a5f; padding: 32px 28px; border-radius: 20px; box-shadow: 0 0 35px rgba(255, 42, 95, 0.35); text-align: center; max-width: 500px; width: 100%;">
      <div style="font-size: 11px; font-weight: 800; color: #ff2a5f; letter-spacing: 1.5px; margin-bottom: 12px;">DOOMSHAME TEST ROAST</div>
      <h1 style="font-size: 22px; color: #ffffff; margin: 0 0 16px 0; font-weight: 900;">TEST TRIGGER EXECUTED</h1>
      ${mediaHtml}
      <div style="background: rgba(5, 8, 17, 0.8); border-left: 4px solid #ff2a5f; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px; text-align: left;">
        <div style="font-size: 15px; font-weight: 600; color: #f8fafc; line-height: 1.6;">"${escapeAttr(rule.roast)}"</div>
      </div>
      <button id="dismissLocalRoastBtn" style="width: 100%; padding: 16px; font-size: 14px; font-weight: 800; background: linear-gradient(135deg, #ff2a5f, #d91b48); color: #ffffff; border: none; border-radius: 12px; cursor: pointer;">
        CLOSE TEST OVERLAY
      </button>
    </div>
  `;

  document.body.appendChild(overlay);
  document.getElementById("dismissLocalRoastBtn").addEventListener("click", () => overlay.remove());
}

function isMessageableTab(url) {
  if (!url) return false;
  return !url.startsWith("chrome://") && 
         !url.startsWith("chrome-extension://") && 
         !url.startsWith("edge://") && 
         !url.startsWith("about:") && 
         !url.includes("chromewebstore");
}

function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.style.display = "block";
  setTimeout(() => {
    toast.style.display = "none";
  }, 3500);
}

function escapeAttr(str) {
  if (!str) return '';
  return str.replace(/"/g, '&quot;');
}