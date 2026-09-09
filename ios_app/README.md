# Artha — AI-Agentic Grocery Price-Comparison & Auto-Cart System

Artha is an intelligent grocery price-comparison and cart execution platform supporting **Swiggy Instamart**, **Zepto**, and **Blinkit**. It features a unified, platform-agnostic backend with two client execution options: **iOS App** (Native WKWebView automation) and **Web App** (Next.js + Chrome Extension).

---

## Architecture Overview

- **Orchestrator**: FastAPI application (`/backend`) that receives parsed grocery requests, triggers agent scrapers, evaluates price/rating optimization, and persists lists and comparison results in Postgres.
- **Worker Agents**: Playwright-based Python agents (`zepto.py`, `blinkit.py`, `instamart.py`) that scrape real-time item pricing, stock status, and confidence scores with Redis caching.
- **Optimizer**: Deterministic price and rating decision logic (`optimizer.py`) governing selection rules via `policy_book.yaml`.
- **Clients**:
  - **iOS Client**: Native SwiftUI application with isolated `WKWebView` automation engines.
  - **Web Client**: Next.js + TypeScript web interface coupled with a Manifest V3 Chrome Extension for cart automation.

---

## Folder Structure

- `/ios-app` — SwiftUI iOS app (Swift 5.9, iOS 17, SwiftData persistence, WKWebView automation).
- `/backend` — FastAPI Python backend (Python 3.11).
  - `/backend/agents` — Worker agent modules (`zepto.py`, `blinkit.py`, `instamart.py`).
  - `/backend/optimizer` — Deterministic price/rating logic.
  - `/backend/policy` — Rules configuration (`policy_book.yaml`).
- `/web` — Next.js + TypeScript + Tailwind CSS web frontend.
- `/extension` — Chrome Extension (Manifest V3) for automated cart insertion on web platforms.
- `/docker-compose.yml` — Local dev environment (FastAPI + Redis + Postgres).

---

## Client Options

### 1. iOS App (Native Client)
- **Features**: List input with WebSocket progress updates, split-cart vs. single-platform optimization view, manual item override, and background-resilient WKWebView execution engine.
- **Run Locally**:
  ```bash
  cd ios-app && xcodegen && xcodebuild -project GroceryApp.xcodeproj -scheme GroceryApp -destination 'platform=iOS Simulator,name=iPhone 15,OS=17.0' build
  ```

### 2. Web App & Chrome Extension (Web Client)
- **Features**: Next.js dashboard for list input and live WebSocket comparison monitoring, paired with a Chrome Extension (Manifest V3) that injects cart automation scripts directly into Zepto, Blinkit, and Swiggy Instamart web tabs.
- **Run Web Frontend**:
  ```bash
  cd web && npm run dev
  ```
- **Load Chrome Extension**:
  1. Open Chrome and navigate to `chrome://extensions/`.
  2. Enable **Developer mode**.
  3. Click **Load unpacked** and select the `/extension` directory.

---

## Running Backend Locally

1. Start backend dependencies & service:
   ```bash
   docker-compose up
   ```

