# DoomShame 🎯

## Basic Details

### Team Name
Astra

### Team Members
- Febin Thomas
- Febin Sabu

### Project Description
An aggressive, over-engineered screen time monitor that roasts your life choices with targeted meme audio soundboards and visual sabotage.

### The Problem (that doesn't exist)
Polite screen time notifications (e.g. *"You've reached your daily limit of 2 hours"*) fail because humans lack self-control and quietly dismiss gentle alerts.

### The Solution (that nobody asked for)
DoomShame replaces polite notifications with inescapable auditory distress, visual humiliation, and coward ambush roasts whenever you browse too long or attempt to pause the tracker.

---

## Technical Details

### Technologies/Components Used
- **Languages:** JavaScript (ES6+), HTML5, CSS3
- **Platform:** Chrome Extension Manifest V3
- **APIs Used:** Chrome Storage API (`unlimitedStorage`), Tabs API, Service Worker Alarms API, Idle API, Web Audio API
- **Media Engine:** Base64 Data URLs & Native Assets (MP3, WAV, GIF, PNG, MP4, WEBM)

### Implementation
- **Real-Time Delta Ticking:** Uses `Date.now()` timestamp diffing to bypass MV3 1-minute alarm throttling, ensuring 1-second accuracy.
- **Rules Engine:** Dynamic settings allowing users to add custom time thresholds, custom meme audio, uploaded images/videos, and custom roast text.
- **DOM Sabotage Overlay:** Injects frosted glass modal overlays into active tabs with Web Audio fallback synthesizer tones if browser autoplay policies block media.
- **Coward Ambush Mode:** Triggering "Pause Monitoring" immediately launches a popup ambush modal and audio roast to punish quitting early.

---

# Installation
1. Clone or download this repository.
2. Open Google Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** in the top-right corner.
4. Click **Load unpacked** and select this directory folder.

# Run
1. Click the **DoomShame** extension icon in your Chrome toolbar.
2. Watch the live screen time counter tick in real time (`HH:MM:SS`).
3. Click **Rules Engine** to customize soundboard triggers, or test the judge demo buttons.

---

# Screenshots
- **Popup Interface:** Live active screen time counter and judge demo panel.
- **Rules Engine:** Settings page with media file pickers and live sound preview buttons.
- **Sabotage Overlay:** Injected web page roast modal when time limit expires.

---

# Diagrams
*(Add workflow diagram here)*

---

# Project Demo
### Video
*(Demo video link will be added here)*

---

## Team Contributions
- **Febin Thomas:** Chrome Extension Architecture, Service Worker Engine, Timer Tracking, and Media Engine.
- **Febin Sabu:** UI/UX OLED Dark Design, Rules Engine Customization, Meme Assets, and Ambush Modal Integration.

---
Made with ❤️ at TinkerHub Useless Projects

[![Static Badge](https://img.shields.io/badge/TinkerHub-24?color=%23000000&link=https%3A%2F%2Fwww.tinkerhub.org%2F)](https://www.tinkerhub.org/)
[![Static Badge](https://img.shields.io/badge/UselessProjects--26-26?link=https%3A%2F%2Ftinkerhub.org%2Fevents%2F1M8ORET9A1%2Fuseless-projects-3.0)](https://tinkerhub.org/events/1M8ORET9A1/useless-projects-3.0)
