<div align="center">

# 🛡️ DisasterShield AI

**A sci-fi style disaster-response console: predict risk, simulate a disaster step by step, coordinate SOS alerts, and ask an AI analyst, all in one React app.**

![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-Llama%203.3%2070B-F55036)
![No backend](https://img.shields.io/badge/backend-none%20needed-2ea44f)

</div>

```
region inputs ──► weighted risk model ──► CRITICAL / HIGH / MEDIUM / LOW ──► resources · evacuation zones · response time
```

## ✨ Nine tabs, one console

| Tab | What it does |
|---|---|
| 📊 **Dashboard** | Stat cards, a scrolling alert ticker, a zone risk map and a risk timeline chart |
| 🔮 **Predict** | Enter floods, earthquakes, cyclones, rainfall, population, infrastructure quality and early-warning status → risk level, resources needed, evacuation zones and target response time |
| ⚡ **Simulate** | Step through a cyclone (and other) response scenario, with a running action log |
| 🆘 **SOS** | Raise and track incident alerts by type, location and severity |
| 🌤 **Weather** | Conditions per zone, tied into the risk picture |
| 🚁 **Resources** | Allocation view for response resources |
| 📊 **Casualty** | Compare estimated casualties with and without early warning / AI-assisted response |
| ✅ **Checklist** | Community preparedness checklist (emergency kit and more) |
| 🤖 **AI Chat** | A disaster analyst powered by Groq (`llama-3.3-70b-versatile`) |

## 🚀 Quick start

```bash
git clone https://github.com/thirthpatel2-web/disastershield-ai.git
cd disastershield-ai
npm install
npm run dev
# ➜ open the URL Vite prints (usually http://localhost:5173)
```

**Turn on the AI chat:** get a free key at [console.groq.com](https://console.groq.com), then set it on line 7 of `src/App.jsx`:

```js
const GROQ_API_KEY = "your_key_here";
```

> ⚠️ Keep your real key out of Git: don't commit `src/App.jsx` with it filled in. A key placed in frontend code is visible to anyone who opens the site, so use this setup for local demos only.

Other scripts: `npm run build` (production build), `npm run preview`, `npm run lint`.

## 🧠 How the risk model works

A transparent weighted score, not a trained black box: each hazard gets a weight (cyclones weigh most, then earthquakes, then floods), rainfall and population add to it, poor infrastructure adds a penalty, and an early-warning system subtracts from it. The score maps to four levels, which then drive the resource estimate, the number of evacuation zones and the target response time.

## 🧾 Honest notes

- Everything except the AI chat runs **entirely in the browser**, with no server.
- Weather conditions, alerts, the timeline and the confidence percentage are **demo values** built into the app, not live feeds.
- The risk model is a hand-tuned formula, meant for explanation and demos rather than real forecasting.

## 👤 Author

Built by [Thirth Patel](https://github.com/thirthpatel2-web).
