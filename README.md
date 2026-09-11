# 📈 Trader Zone — The AI-Powered Trading Journal

> An institutional-grade, AI-powered trading journal workstation built for serious traders. Track, analyze, and elevate your performance with automated broker sync, behavioral scoring, chart vision, and discipline tracking. 100% offline-first, client-side private, and ready for instant deployment to GitHub Pages or Vercel.

---

## ✨ Features & Architecture Overview

### 1. 📊 Executive Trading Dashboard (`/#/dashboard`)
- **Period Filtering**: Today, This Week, This Month, This Year, All Time.
- **Top KPI Cards**: Net P&L (amount & % return), Win Rate %, Profit Factor, Trade Counts (Open / Closed / Break-even), Average Win vs. Average Loss, Max Drawdown ($ and %), and Current Win/Loss Streak.
- **Interactive Cumulative Equity Curve**: Dynamic SVG area chart with real-time balance tracking and hover tooltip breakdowns.
- **Daily Net P&L Bar Chart**: Session-by-session visual profit & loss bars.
- **Trader Zone AI Guidance**: Dynamic real-time recommendation box (`CONTROLLED AGGRESSION`, `NEUTRAL`, or `STAND DOWN / DEFENSIVE`) based on current streak, win rate, and drawdown.
- **Recent Trades Table**: Quick execution summary with one-click review links.

### 2. 🗓️ Interactive Calendar Journal (`/#/journal`) & Day View (`/#/day-view`)
- **Monthly Calendar Grid**: Color-coded daily P&L badges (green/red), total trades per day, win/loss pills, and note reflection indicators.
- **Month-to-Month Navigation**: Quick jump across past and future trading months.
- **Monthly Summary Sidebar**: Total Month P&L, Active Trading Days, Green vs. Red days count, and Average Daily P&L.
- **Deep Day View (`/#/day-view`)**: Pre-market game plan, post-market reflection notes, psychological check-in (mood & 1-5 star discipline rating), rule compliance checklist, and full list of day trades.

### 3. 📜 Trade History & Detail Review (`/#/trades` & `/#/trades/:id`)
- **Multi-Factor Filter Bar**: Filter by Symbol, Direction (BUY/SELL), Status (OPEN/CLOSED), Outcome (Win/Loss), Strategy, and keyword search.
- **Comprehensive Logging**: Symbol, Direction, Lots, Open/Close Times, Entry/Exit Prices, SL/TP, Realized vs Planned R:R, Pips/Points, Gross P&L, Fees, and Net P&L.
- **Live Auto-Calculation**: Real-time pip, P&L, and risk-reward calculation in the Add Trade modal.
- **Before & After Chart Visualizer**: High-resolution screenshot viewer for entry setups and trade outcomes.
- **Post-Mortem Review**: Document technical confluences, execution mistakes, and lessons learned.

### 4. 📈 Performance Analytics Suite (`/#/analytics`)
- **Overview**: Cumulative equity curve and peak-to-valley underwater drawdown chart.
- **Sessions & Heatmaps**: Day-of-week performance heatmap (Mon-Fri) and session breakdown (London, New York, London/NY Overlap, Asian).
- **Instruments & Assets**: Per-symbol ranking across Forex, Gold, Crypto, and Indices with volume and win rate stats.
- **Directional Analysis**: Side-by-side comparison of Long (BUY) vs. Short (SELL) profitability.

### 5. 📑 Executive Reports & Statements (`/#/reports`)
- Audited financial statement generator for any custom period.
- Statistical summary: Gross Profit, Gross Loss, Net P&L, Profit Factor, Expectancy, Win/Loss Ratio, Total Volume (Lots), and Total Commissions.
- One-click **Print / Save PDF Report** formatted for sharing or audits.

### 6. 🧠 Trader Zone AI 2.0 (`/#/ai-2`)
- **AI Chart Vision**: Upload or paste chart screenshots; automated neural scanner identifies market structure (BOS, Order Block Retests, FVGs), key levels, confidence score, and complete trade plan (Entry, SL, TP, R:R).
- **AI Trading Coach**: Interactive conversational trading mentor trained on trading psychology and risk management. Pre-loaded with one-click performance diagnosis prompts.
- **Behavioral Pattern Alerts**: Automatically detects revenge sizing, overtrading, and premature exits.

### 7. 🛡️ Discipline Tracker & Trading Rules (`/#/progress`)
- **Discipline Score (0-100%)**: Dynamically updated based on daily rule adherence in your journal reviews.
- **Discipline Streak**: Consecutive trading days with 100% rule compliance.
- **Rule Builder**: Customizable guardrails (e.g. "Max 1.5% risk", "Stop loss mandate", "Max 2 daily losses").
- **Milestones & Achievements**: Unlockable trader badges.

### 8. 🎨 Social Share Card Studio (`/#/share-cards`)
- Create high-resolution social recap cards for Instagram (Square 1:1, Story 9:16) and Twitter/X (16:9 Banner).
- Multiple visual themes: Purple Royalty, Cyber Neon, Emerald Elite, and Dark Obsidian.
- Instant PNG download or clipboard copy.

### 9. 📺 Live Web Terminal (`/#/terminal`)
- Embedded real-time **TradingView Advanced Charting Widget** with multi-asset search (Forex, Crypto, Indices, Gold) and technical indicators.
- Built-in **Position Size & Lot Calculator**.

### 10. ⏱️ Global Market Hours (`/#/market-hours`)
- 24-hour visual market clocks for London, New York, Tokyo, and Sydney.
- Live session status indicators and London / New York high-liquidity overlap alerts.

### 11. 🏆 Trader Community Leaderboard (`/#/leaderboard`)
- Verified ranking showcase displaying monthly Net P&L, win rates, and profit factors.

### 12. 🔌 Broker Hub & Statement Importer (`/#/broker-hub`)
- Connect and switch between multiple trading accounts (e.g. "Prop Firm Challenge", "Personal MT5 Live").
- Universal statement importer supporting MetaTrader 4/5 (HTML & CSV), Exness, Vantage, XM, and standard CSV files.

### 13. ⚙️ Settings & Data Ownership (`/#/settings`)
- Profile customization, currency selector (USD, EUR, GBP, INR, JPY, AUD), and risk limits.
- **100% Client-Side Privacy**: All data persists in your browser's local storage.
- **One-Click JSON Backup & Restore**: Export your full database to a JSON file and restore anytime.

---

## 🚀 Quick Start (Running Locally)

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

3. **Build for production**:
   ```bash
   npm run build
   ```

---

## 🌐 Deploy to GitHub Pages in 2 Minutes

1. Initialize git and push to your GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Trader Zone AI Trading Journal"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```

2. In your GitHub repository:
   - Go to **Settings** -> **Pages**.
   - Under **Build and deployment** -> **Source**, select **GitHub Actions**.
   - The included `.github/workflows/deploy.yml` will automatically build and publish your website!

---

## 🛡️ License
Built for personal use and study.
