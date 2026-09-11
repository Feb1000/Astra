const defaultRules = [
  { id: "rule_1h", hours: 1, minutes: 0, sound: "1h.mp3", image: "1h.gif", roast: "1 HOUR ON CHROME! You promised yourself 'just 5 minutes'. Look at you now!" },
  { id: "rule_2h", hours: 2, minutes: 0, sound: "2h.mp3", image: "2h.gif", roast: "2 HOURS DETECTED! That's a whole movie length of pure unadulterated procrastination!" },
  { id: "rule_6h7m", hours: 6, minutes: 7, sound: "67.mp3", image: "67.gif", roast: "6h 7m. Peak brainrot achieved. Bro is studying the blade." },
  { id: "rule_8h", hours: 8, minutes: 0, sound: "faaa.mp3", image: "faaa.gif", roast: "FAAAA! 8 Hours! Your chair misses you! EMOTIONAL DAMAGE!" }
];

document.addEventListener("DOMContentLoaded", async () => {
  const data = await chrome.storage.local.get("customRules");
  const rules = (data.customRules && data.customRules.length > 0) ? data.customRules : defaultRules;
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
      // Reset firedTriggers on save so new/updated rules fire properly!
      await chrome.storage.local.set({ customRules: rules, firedTriggers: [] });
      showToast("Settings saved & triggers reset successfully!");
      // Re-render sorted rules so UI matches saved order
      renderRules(rules);
    } catch (err) {
      showToast("Error saving rules: " + err.message);
    }
  });

  document.getElementById("resetDefaultsBtn").addEventListener("click", async () => {
    if (confirm("Reset rule engine back to default rules?")) {
      try {
        await chrome.storage.local.set({ customRules: defaultRules, firedTriggers: [] });
        renderRules(defaultRules);
        showToast("Restored default rules!");
      } catch (err) {
        showToast("Error resetting rules: " + err.message);
      }
    }
  });
});

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
      <input type="text" value="${escapeAttr(rule.image)}" class="img-input" placeholder="67.gif or Data URL">
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

  // Dynamic preview update when text input changes
  imgInput.addEventListener("input", () => {
    previewBox.innerHTML = renderPreviewHtml(imgInput.value.trim());
  });

  // Audio Preview handler
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

  // File upload handlers for Audio
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

  // File upload handlers for Image/GIF/Video
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

  // Attach event listeners dynamically
  card.querySelector(".btn-danger").addEventListener("click", () => card.remove());

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

function renderPreviewHtml(mediaVal) {
  if (!mediaVal) return `<span style="font-size:11px; color:#64748b;">No media loaded</span>`;
  
  const mediaUrl = (mediaVal.startsWith("data:") || mediaVal.startsWith("http")) 
    ? mediaVal 
    : chrome.runtime.getURL(`assets/${mediaVal}`);

  const isVideo = mediaVal.includes("data:video/") || 
                  /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(mediaVal);

  if (isVideo) {
    return `<video src="${mediaUrl}" autoplay loop muted playsinline style="max-height:100%; max-width:100%; object-fit:contain; border-radius:4px;"></video>`;
  } else {
    return `<img src="${mediaUrl}" style="max-height:100%; max-width:100%; object-fit:contain; border-radius:4px;" alt="Preview" onerror="this.outerHTML='<span style=\\'font-size:11px; color:#ef4444;\\'>Failed to load preview</span>'"/>`;
  }
}

function testRuleInActiveTab(rule) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab?.id || tab.url?.startsWith("chrome://") || tab.url?.startsWith("chrome-extension://")) {
      showToast("Switch to an active webpage (e.g. google.com) to test roast injection.");
      return;
    }
    chrome.tabs.sendMessage(tab.id, { type: "EXECUTE_ROAST", payload: rule }, () => {
      if (chrome.runtime.lastError) {
        showToast("Open a regular webpage in another tab to test roast injection.");
      } else {
        showToast(`Fired roast: "${rule.roast}"`);
      }
    });
  });
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