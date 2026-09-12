chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "EXECUTE_ROAST") {
    showRoastOverlay(message.payload);
  }
});

function showRoastOverlay(rule) {
  // Play meme audio soundboard
  if (rule.sound) {
    const soundVal = rule.sound.trim();
    const audioUrl = (soundVal.startsWith("http") || soundVal.startsWith("data:")) 
      ? soundVal 
      : chrome.runtime.getURL(`assets/${soundVal}`);
    const audio = new Audio(audioUrl);
    audio.play().catch(err => console.log("DoomShame: Audio blocked by browser:", err));
  }

  // Remove existing overlay if present
  const existingOverlay = document.getElementById("doomshame-overlay");
  if (existingOverlay) existingOverlay.remove();
  const existingStyle = document.getElementById("doomshame-style");
  if (existingStyle) existingStyle.remove();

  const overlay = document.createElement("div");
  overlay.id = "doomshame-overlay";
  overlay.style.cssText = `
    position: fixed !important; top: 0 !important; left: 0 !important;
    width: 100vw !important; height: 100vh !important;
    background: rgba(5, 8, 17, 0.95) !important;
    backdrop-filter: blur(12px) !important; -webkit-backdrop-filter: blur(12px) !important;
    z-index: 2147483647 !important; display: flex !important; flex-direction: column !important;
    align-items: center !important; justify-content: center !important;
    color: #f8fafc !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    animation: doomshameFadeIn 0.3s ease-out !important;
    box-sizing: border-box !important; margin: 0 !important; padding: 20px !important;
  `;

  const style = document.createElement('style');
  style.id = "doomshame-style";
  style.innerHTML = `@keyframes doomshameFadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`;
  document.head.appendChild(style);

  const imgVal = (rule.image || 'faaa.gif').trim();
  const imgUrl = (imgVal.startsWith("http") || imgVal.startsWith("data:")) 
    ? imgVal 
    : chrome.runtime.getURL(`assets/${imgVal}`);

  const isVideo = imgVal.includes("data:video/") || /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(imgVal);

  const mediaHtml = isVideo 
    ? `<video src="${imgUrl}" autoplay loop muted playsinline style="width: 100%; max-height: 220px; object-fit: contain; border-radius: 12px; margin-bottom: 20px; border: 1px solid #1e293b;"></video>`
    : `<img src="${imgUrl}" style="width: 100%; max-height: 220px; object-fit: contain; border-radius: 12px; margin-bottom: 20px; border: 1px solid #1e293b;" alt="Meme" />`;

  overlay.innerHTML = `
    <div style="background: #0d1322; border: 2px solid #ff2a5f; padding: 32px 28px; border-radius: 20px; box-shadow: 0 0 35px rgba(255, 42, 95, 0.4); text-align: center; max-width: 500px; width: 100%; position: relative; overflow: hidden; box-sizing: border-box;">
      <div style="position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(255,42,95,0.15) 0%, transparent 60%); pointer-events: none;"></div>
      
      <div style="display: inline-block; padding: 5px 14px; background: rgba(255, 42, 95, 0.15); border: 1px solid rgba(255, 42, 95, 0.4); border-radius: 20px; font-size: 11px; font-weight: 800; color: #ff2a5f; letter-spacing: 1.5px; margin-bottom: 12px; text-transform: uppercase;">
        DOOMSHAME INCONVENIENCE ENGINE
      </div>
      
      <h1 style="font-size: 22px; color: #ffffff; margin: 0 0 16px 0; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase; text-shadow: 0 0 10px rgba(255,42,95,0.5);">
        TIME'S UP FOR BROWSING
      </h1>
      
      ${mediaHtml}
      
      <div style="background: rgba(5, 8, 17, 0.8); border-left: 4px solid #ff2a5f; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px; text-align: left; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
        <div style="font-size: 15px; font-weight: 600; color: #f8fafc; line-height: 1.6; word-wrap: break-word;">"${escapeHtml(rule.roast)}"</div>
      </div>
      
      <button id="dismissRoastBtn" style="width: 100%; padding: 16px; font-size: 14px; font-weight: 800; background: linear-gradient(135deg, #ff2a5f, #d91b48); color: #ffffff; border: none; border-radius: 12px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 20px rgba(255,42,95,0.4); text-transform: uppercase; letter-spacing: 0.5px;">
        I Will Touch Grass (Dismiss)
      </button>
    </div>
  `;

  document.body.appendChild(overlay);

  const btn = document.getElementById("dismissRoastBtn");
  if (btn) {
    btn.addEventListener("mouseover", () => btn.style.transform = "translateY(-2px)");
    btn.addEventListener("mouseout", () => btn.style.transform = "translateY(0)");
    btn.addEventListener("click", () => { 
      overlay.remove(); 
      style.remove(); 
    });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}