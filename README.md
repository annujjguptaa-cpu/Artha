# 🛒 Artha — AI-Agentic Grocery Price-Comparison & Auto-Cart System

[![Python 3.11](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![Swift 5.9](https://img.shields.io/badge/Swift-5.9-FA7343?style=for-the-badge&logo=swift&logoColor=white)](https://developer.apple.com/swift/)
[![Manifest V3](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

**Artha** is an end-to-end, multi-agentic grocery price-comparison and automated cart-execution platform supporting **Swiggy Instamart**, **Zepto**, and **Blinkit**. 

It intelligently parses unformatted grocery lists, orchestrates parallel headless scraping workers, applies deterministic price/rating optimization rules, and executes 1-click cart insertion across multiple platforms via **iOS WKWebView Automation** or a **Manifest V3 Chrome Extension**.

---

## 🏗️ Architecture & System Flow

Artha features a platform-agnostic, decoupled backend that powers two independent client options:
1. **Web Client**: Next.js 14 App Router + Manifest V3 Chrome Extension for desktop/web execution.
2. **iOS Native Client**: SwiftUI + SwiftData + Isolated `WKWebView` instances for native mobile execution.

```mermaid
flowchart TD
    subgraph Clients["📱 Client Layer"]
        A1["Next.js Web Frontend\n(/web)"]
        A2["SwiftUI iOS App\n(/ios-app)"]
        EXT["Chrome Extension\n(/extension)"]
        WK["WKWebView Engine\n(iOS Native)"]
    end

    subgraph Backend["⚡ FastAPI Backend Engine (/backend)"]
        API["FastAPI Orchestrator\n(main.py & orchestrator.py)"]
        LLM["Claude API\nList Parser"]
        OPT["Deterministic Optimizer\n(optimizer.py)"]
        POLICY["Policy Book Rules\n(policy_book.yaml)"]
    end

    subgraph Workers["🤖 Agent Workers (/backend/agents)"]
        Z_AGENT["Zepto Agent Worker\n(Playwright / Scraper)"]
        B_AGENT["Blinkit Agent Worker\n(Playwright / Scraper)"]
        I_AGENT["Instamart Agent Worker\n(Playwright / Scraper)"]
    end

    subgraph Data["💾 Persistence & Cache"]
        REDIS[("Redis Cache")]
        DB[("Postgres Database")]
    end

    subgraph TargetStores["🛍️ Grocery Web Platforms"]
        ZEPTO["Zepto Web Store"]
        BLINKIT["Blinkit Web Store"]
        INSTAMART["Swiggy Instamart"]
    end

    %% Flow connections
    A1 -- "POST /parse-list & /compare" --> API
    A2 -- "POST /parse-list & /compare" --> API
    API -- "Parse raw text" --> LLM
    API -- "Cache Check / Set" --> REDIS
    API -- "Store Lists & Results" --> DB
    API -- "Parallel Scrape Tasks" --> Z_AGENT & B_AGENT & I_AGENT
    
    Z_AGENT -- "Scrape Prices" --> ZEPTO
    B_AGENT -- "Scrape Prices" --> BLINKIT
    I_AGENT -- "Scrape Prices" --> INSTAMART
    
    Z_AGENT & B_AGENT & I_AGENT -- "Raw Worker Results" --> OPT
    POLICY -- "Rules & Thresholds" --> OPT
    OPT -- "Optimization Result" --> API
    API -- "WebSocket / Polling Progress" --> A1 & A2

    %% Execution flow
    A1 -- "Build My Carts (postMessage)" --> EXT
    EXT -- "Automated Cart Fill" --> ZEPTO & BLINKIT & INSTAMART
    A2 -- "Execute Cart Scripts" --> WK
    WK -- "Automated Cart Fill" --> ZEPTO & BLINKIT & INSTAMART
```

---

## 🔄 Detailed Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Web as Next.js Web / iOS App
    participant API as FastAPI Backend
    participant LLM as Claude API Parser
    participant Worker as Parallel Scrapers
    participant Opt as Optimizer Engine
    participant Ext as Chrome Ext / WKWebView
    participant Store as Zepto / Blinkit / Instamart

    User->>Web: Paste Raw Grocery List
    Web->>API: POST /parse-list {raw_text}
    API->>LLM: Parse items & detect brand locks
    LLM-->>API: Structured Items JSON
    API-->>Web: Return ShoppingListResponse {list_id}
    
    Web->>API: POST /compare/{list_id}
    Web->>API: WS /ws/compare/{list_id} (Connect)
    
    par Scrape Platforms
        API->>Worker: Fetch Zepto matches
        API->>Worker: Fetch Blinkit matches
        API->>Worker: Fetch Instamart matches
    end
    
    Worker-->>API: Scraped Prices, Stock & Ratings
    API-->>Web: WS Broadcast Progress (25% -> 50% -> 100%)
    
    API->>Opt: Evaluate Prices, Ratings & Policy Rules
    Opt-->>API: Return Split-Cart vs Single Store Results
    API-->>Web: Final OptimizationResult JSON
    
    Web->>User: Display Savings Highlight (₹Saved), Cards & Overrides
    
    User->>Web: Click "Build My Carts"
    Web->>Ext: Dispatch Cart Execution Payload
    
    par Automated Cart Injection
        Ext->>Store: Search & Click "Add" (Zepto Tab)
        Ext->>Store: Search & Click "Add" (Blinkit Tab)
        Ext->>Store: Search & Click "Add" (Instamart Tab)
    end
    
    Ext-->>Web: Return Success Status & Cart Counts
    Web->>User: Show Ready Carts for 1-Click Checkout
```

---

## Key Features

- 🧠 **AI List Parser**: Powered by Claude API to extract clean product names, quantities, units, and detect `brand_lock` flags (e.g. *"Amul Butter 500g"* locks brand to Amul, whereas *"Milk 1L"* stays generic).
- ⚡ **Parallel Scraper Workers**: Asynchronous Playwright scrapers (`zepto.py`, `blinkit.py`, `instamart.py`) fetching real-time prices, stock availability, ratings, and fuzzy-matching confidence scores.
- 🎯 **Deterministic Optimization Engine**: No LLM price hallucinations. Strict mathematical evaluation governed by `policy_book.yaml` (rating thresholds, brand locks, split delivery-fee calculation).
- 💰 **Split-Cart Savings Banner**: Visually dominant savings display featuring animated count-up calculation comparing Split-Cart savings against single-store orders.
- 🔄 **Universal Manual Overrides**: Every item card allows users to manually re-assign matches across alternative stores and products.
- ⚠️ **Needs-Review Flags**: Visually distinct amber borders requiring user confirmation for low-confidence or brand-mismatched items.
- 📱 **Dual Client Execution**:
  - **Web Client**: Next.js 14 + Manifest V3 Chrome Extension injects items directly into live browser tabs.
  - **iOS Client**: Native SwiftUI + SwiftData app with 3 isolated `WKWebView` automation instances.
- 🚀 **Demo Mode Support**: Enable `DEMO_MODE=1` to simulate instant, realistic scraped results for offline or live stage demos.

---

## 📂 Repository & Monorepo Structure

```text
Artha/
├── backend/                  # FastAPI Backend (Python 3.11)
│   ├── agents/               # Scraper worker modules
│   │   ├── zepto.py           # Zepto Playwright agent
│   │   ├── blinkit.py         # Blinkit Playwright agent
│   │   ├── instamart.py       # Swiggy Instamart Playwright agent
│   │   └── utils.py           # Redis caching & helper utilities
│   ├── optimizer/            # Deterministic price/rating decision logic
│   │   ├── optimizer.py       # Core optimization math logic
│   │   └── schemas.py         # Pydantic schemas for optimizer
│   ├── policy/               # Policy rules configuration
│   │   └── policy_book.yaml   # Rules for thresholds & delivery splits
│   ├── database.py           # SQLAlchemy database setup
│   ├── main.py               # FastAPI application entrypoint
│   ├── models.py             # Postgres database models
│   ├── orchestrator.py       # Comparison orchestrator & WebSocket manager
│   ├── schemas.py            # API request/response schemas
│   ├── seed_demo.py          # Demo data seeding script
│   └── Dockerfile            # Production Dockerfile for backend
├── web/                      # Next.js 14 Web Client (TypeScript + Tailwind)
│   ├── app/                  # Next.js App Router pages
│   │   ├── page.tsx          # Home Page (List input & Clipboard paste)
│   │   ├── results/[list_id]/ # Live Progress & Optimization Results
│   │   ├── history/          # Saved Comparisons & Savings Dashboard
│   │   ├── layout.tsx        # Root layout & PWA viewport setup
│   │   └── globals.css       # Tailwind CSS & custom animations
│   ├── components/           # UI Components (Navbar, ErrorBoundary)
│   ├── lib/                  # API client (`api.ts`) & LocalStorage (`storage.ts`)
│   ├── public/               # PWA manifest.json & Service Worker (`sw.js`)
│   └── vercel.json           # Vercel deployment configuration
├── extension/                # Chrome Extension (Manifest V3)
│   ├── manifest.json         # Extension permissions & content scripts
│   ├── config.js             # Centralized platform DOM selectors
│   ├── web-bridge.js         # Web app detection & postMessage bridge
│   ├── content-runner.js     # Cart automation runner with MutationObserver
│   ├── background.js         # Service worker execution state manager
│   ├── popup.html            # Extension status popup UI
│   └── popup.js              # Popup live logger logic
├── ios-app/                  # SwiftUI iOS Client (Swift 5.9, iOS 17 target)
│   └── Sources/              # SwiftUI Views & CartExecutionEngine (WKWebView)
├── docker-compose.yml        # Local Dev Environment (FastAPI + Redis + Postgres)
├── .env.example              # Environment variables template
├── DEPLOY.md                 # Step-by-step production deployment guide
└── DEMO_SCRIPT.md            # 3-minute live presentation walkthrough
```

---

## 📡 Backend API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/parse-list` | Parses raw text via Claude API, persists `ShoppingList` to Postgres |
| `GET` | `/list/{list_id}` | Retrieves parsed shopping list items |
| `POST` | `/compare/{list_id}` | Triggers parallel agent scrapers, runs optimizer, persists results |
| `GET` | `/compare/{list_id}/status` | Polling endpoint for comparison completion status |
| `WS` | `/ws/compare/{list_id}` | WebSocket endpoint streaming live progress percentage |

---

## ⚡ Quick Start (Local Development)

### 1. Prerequisites
- **Node.js**: `v18.0+`
- **Python**: `3.11+`
- **Docker**: For local Redis & Postgres services

### 2. Environment Setup
Copy `.env.example` to create your local `.env` configuration:
```bash
cp .env.example .env
```
Ensure your `.env` contains:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/grocery_db
REDIS_URL=redis://localhost:6379/0
ANTHROPIC_API_KEY=your_anthropic_api_key_here
DEMO_MODE=1
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Run Backend (Docker)
```bash
docker-compose up -d --build
```
Backend API will be running at `http://localhost:8000`.

### 4. Run Web Frontend
```bash
cd web
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

### 5. Load Chrome Extension
1. Open Google Chrome and go to `chrome://extensions/`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the `/extension` directory in this repo.

---

## ☁️ Production Deployment Summary

- **Backend**: Deployed to **Railway** or **Render** using `/backend/Dockerfile` connected to managed Postgres (Supabase) and Redis (Upstash).
- **Web Frontend**: Deployed to **Vercel** setting the root directory to `web` and configuring `NEXT_PUBLIC_API_URL`.
- **Chrome Extension**: Unpacked load via Chrome Developer Mode or packaged for Chrome Web Store.

For comprehensive deployment commands, see [DEPLOY.md](file:///c:/Users/ASUS/Downloads/Artha/ios_app/DEPLOY.md).

---

## 📄 License & Attribution

Built for the **Artha** AI-Agentic Grocery Engine project. All rights reserved.
