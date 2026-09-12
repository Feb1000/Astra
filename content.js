const DISMISS_BUTTON_TEXTS = [
  "I Will Touch Grass (I Promise)",
  "Closing TikTok Right Now...",
  "Un-gluing My Butt From This Chair",
  "I Accept My Emotional Damage",
  "Walking Outside To See Real Sunlight",
  "Fine, I Will Go Do Actual Work",
  "I Yield To The Doom Engine",
  "Closing This Tab Before My Eyes Melt",
  "Attempting To Reboot My Brain...",
  "Forgive Me, I Have Sinned"
];

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "EXECUTE_ROAST") {
    try {
      showRoastOverlay(message.payload);
      sendResponse({ status: "ROAST_DISPLAYED" });
    } catch (err) {
      console.log("DoomShame content script roast error:", err);
      sendResponse({ status: "ROAST_ERROR", error: err.message });
    }
  }
  return true;
});

function showRoastOverlay(rule) {
  // Deduplicate existing overlay if present
  const existingOverlay = document.getElementById("doomshame-overlay");
  if (existingOverlay) existingOverlay.remove();
  const existingStyle = document.getElementById("doomshame-style");
  if (existingStyle) existingStyle.remove();

  // 1. Play sound effect
  playRoastSound(rule.sound);

  // 2. Speak roast out loud with Chrome Voice TTS
  speakRoast(rule.roast);

  const overlay = document.createElement("div");
  overlay.id = "doomshame-overlay";
  overlay.style.cssText = `
    position: fixed !important; top: 0 !important; left: 0 !important;
    width: 100vw !important; height: 100vh !important;
    background: rgba(5, 8, 17, 0.96) !important;
    backdrop-filter: blur(25px) !important; -webkit-backdrop-filter: blur(25px) !important;
    z-index: 2147483647 !important; display: flex !important; flex-direction: column !important;
    align-items: center !important; justify-content: center !important;
    color: #f8fafc !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    animation: doomshameFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
    box-sizing: border-box !important; margin: 0 !important; padding: 20px !important;
  `;

  const style = document.createElement('style');
  style.id = "doomshame-style";
  style.innerHTML = `
    @keyframes doomshameFadeIn {
      from { opacity: 0; transform: scale(0.92); }
      to { opacity: 1; transform: scale(1); }
    }
  `;
  document.head.appendChild(style);

  const mediaVal = (rule.image || 'faaa.gif').trim();
  const mediaUrl = (mediaVal.startsWith("data:") || mediaVal.startsWith("http")) 
    ? mediaVal 
    : chrome.runtime.getURL(`assets/${mediaVal}`);

  const isVideo = mediaVal.includes("data:video/") || 
                  /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(mediaVal);

  const mediaStyle = "width: 100%; max-height: 220px; object-fit: contain; background: #050811; border-radius: 12px; margin-bottom: 20px; border: 2px solid #ff2a5f; box-shadow: 0 0 25px rgba(255,42,95,0.4), inset 0 2px 4px rgba(0,0,0,0.8);";

  const mediaTagHtml = isVideo
    ? `<video id="doomshameMedia" src="${mediaUrl}" autoplay loop muted playsinline style="${mediaStyle}"></video>`
    : `<img id="doomshameMedia" src="${mediaUrl}" style="${mediaStyle}" alt="Meme Saboteur" />`;

  // Randomly pick a dismiss button text
  const dismissText = DISMISS_BUTTON_TEXTS[Math.floor(Math.random() * DISMISS_BUTTON_TEXTS.length)];

  overlay.innerHTML = `
    <div style="background: linear-gradient(145deg, #0b0f19, #121827); border: 2px solid #ff2a5f; padding: 32px 28px; border-radius: 20px; box-shadow: 0 0 45px rgba(255, 42, 95, 0.45); text-align: center; max-width: 520px; width: 100%; position: relative; overflow: hidden; box-sizing: border-box;">
      <div style="position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(255,42,95,0.2) 0%, transparent 60%); pointer-events: none;"></div>
      
      <div style="display: inline-block; padding: 6px 16px; background: rgba(255, 42, 95, 0.2); border: 1px solid rgba(255, 42, 95, 0.5); border-radius: 20px; font-size: 11px; font-weight: 900; color: #ff2a5f; letter-spacing: 2px; margin-bottom: 14px; text-transform: uppercase;">
        DOOMSHAME SABOTAGE ENGINE
      </div>
      
      <h1 style="font-size: 24px; color: #ffffff; margin: 0 0 16px 0; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase; text-shadow: 0 0 12px rgba(255,42,95,0.6);">
        TIME'S UP FOR BROWSING
      </h1>
      
      ${mediaTagHtml}
      
      <div style="background: rgba(5, 8, 17, 0.85); border-left: 4px solid #ff2a5f; padding: 18px 22px; border-radius: 10px; margin-bottom: 24px; text-align: left; box-shadow: 0 4px 15px rgba(0,0,0,0.6);">
        <div style="font-size: 16px; font-weight: 700; color: #f8fafc; line-height: 1.6; word-wrap: break-word;">"${escapeHtml(rule.roast)}"</div>
      </div>
      
      <button id="dismissRoastBtn" style="width: 100%; padding: 16px; font-size: 15px; font-weight: 900; background: linear-gradient(135deg, #ff2a5f, #d91b48); color: #ffffff; border: none; border-radius: 12px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 25px rgba(255,42,95,0.5); text-transform: uppercase; letter-spacing: 0.5px;">
        ${dismissText}
      </button>
    </div>
  `;

  document.body.appendChild(overlay);

  const btn = document.getElementById("dismissRoastBtn");
  if (btn) {
    btn.addEventListener("mouseover", () => btn.style.transform = "translateY(-2px)");
    btn.addEventListener("mouseout", () => btn.style.transform = "translateY(0)");
    btn.addEventListener("click", () => { 
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      playSynthBeep(440, 0.1);
      overlay.remove(); 
      style.remove(); 
    });
  }
}

function speakRoast(text) {
  try {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.1;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  } catch (e) {
    console.log("DoomShame TTS error:", e);
  }
}

function playRoastSound(soundFile) {
  if (!soundFile) return;
  const audioUrl = (soundFile.startsWith("data:") || soundFile.startsWith("http")) 
    ? soundFile 
    : chrome.runtime.getURL(`assets/${soundFile}`);
  const audio = new Audio(audioUrl);
  audio.play().catch(err => {
    console.log("DoomShame: Browser autoplay blocked file audio, playing synthetic alert tone instead.", err);
    playSynthBeep(600, 0.4);
  });
}

function playSynthBeep(freq, duration) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq / 2, ctx.currentTime + duration);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Audio context not allowed or failed
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}