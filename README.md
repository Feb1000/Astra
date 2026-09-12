# 💀 Astra Extension (v2.0)

> **The Ultimate Anti-Doomscroll Inconvenience Engine & Screen Time Roast Tracker**

Astra (formerly DoomShame) is a Google Chrome extension (Manifest V3) designed to track your active browsing time and roast you with custom audio soundboards, meme overlays, and desktop notifications whenever you hit screen time milestones.

---

## 🔥 Key Features

- **Real-Time Active Tracking**: Tracks exact screen time in real time with high-precision delta timing across service worker wakeups.
- **In-Page Glassmorphism Roast Overlay**: Injects fullscreen dark glassmorphism modals directly into active web pages with meme GIFs/videos and audio playback.
- **Fail-safe Script Injection**: Automatically injects `content.js` into web tabs via `chrome.scripting.executeScript` if a tab was opened prior to extension loading.
- **Coward Ambush System**: If you try to pause screen time tracking, Astra ambushes you with an instant coward roast modal and audio callout!
- **Custom Trigger Studio**:
  - Set custom hour/minute thresholds.
  - Upload local MP3 audio files or image/video files (converted automatically to base64 data URLs).
  - Preview audio soundboards and media playback instantly.
  - Test live triggers directly on active web pages.
- **Default Triggers Out of the Box**:
  - `0h 1m`: 1 Minute Roast session trigger
  - `0h 2m`: 2 Minutes Wasted trigger
  - `1h 0m`: 1 Hour Chrome Doomscroll roast
  - `2h 0m`: 2 Hours Movie Length procrastination roast
  - `6h 7m`: Peak Brainrot study the blade roast
  - `8h 0m`: 8 Hours Emotional Damage roast

---

## 🛠️ Installation Guide

1. Open **Google Chrome** and navigate to `chrome://extensions`.
2. Enable **Developer mode** using the toggle switch in the top-right corner.
3. Click **Load unpacked**.
4. Select the project folder: `c:\Users\lenovo\OneDrive\Desktop\doomshame-extension`.
5. Pin the **Astra** extension icon to your browser toolbar.

---

## 🚀 How to Test 1-Minute Trigger

1. Open the **Astra** popup window from the Chrome toolbar.
2. Click **Set 55s** (this sets active time to 55 seconds).
3. Open any active web page (e.g. `https://google.com` or `https://wikipedia.org`).
4. After **5 seconds** (when timer hits `00:01:00`), the roast overlay will pop up with sound, media, and text!

---

## 📁 Repository & Downloads

- **GitHub Repository**: [https://github.com/Feb1000/Astra](https://github.com/Feb1000/Astra)
- **Direct ZIP Download**: [https://github.com/Feb1000/Astra/archive/refs/heads/main.zip](https://github.com/Feb1000/Astra/archive/refs/heads/main.zip)
