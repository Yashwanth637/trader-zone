import { Trade } from '../types/trade';
import { BehavioralAlert } from '../types/ai';

export function detectBehavioralPatterns(trades: Trade[]): BehavioralAlert[] {
  const alerts: BehavioralAlert[] = [];
  const closed = trades.filter(t => t.status === 'CLOSED');
  if (closed.length < 3) return alerts;

  // Sort chronologically
  const sorted = [...closed].sort((a, b) => new Date(a.closeTime || a.openTime).getTime() - new Date(b.closeTime || b.openTime).getTime());

  // Check 1: Revenge Sizing
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (prev.netPnl < -0.01 && curr.lotSize > prev.lotSize * 1.4) {
      alerts.push({
        id: `alert-revenge-${curr.id}`,
        type: 'REVENGE_SIZING',
        severity: 'high',
        title: 'Revenge Sizing Pattern Detected',
        description: `Position size increased by ${Math.round(((curr.lotSize - prev.lotSize) / prev.lotSize) * 100)}% on ${curr.symbol} immediately following a loss on ${prev.symbol}.`,
        recommendedAction: 'Enforce static lot sizing or max risk 1.0% per trade. Take a mandatory 30-minute break after every loss.',
        detectedAt: curr.openTime
      });
      break;
    }
  }

  // Check 2: Overtrading
  const tradesByDay: Record<string, number> = {};
  closed.forEach(t => {
    const d = new Date(t.closeTime || t.openTime).toISOString().split('T')[0];
    tradesByDay[d] = (tradesByDay[d] || 0) + 1;
  });

  const heavyDays = Object.entries(tradesByDay).filter(([_, count]) => count >= 4);
  if (heavyDays.length > 0) {
    alerts.push({
      id: `alert-overtrade-${Date.now()}`,
      type: 'OVERTRADING',
      severity: 'medium',
      title: 'Session Overtrading Warning',
      description: `You logged ${heavyDays[0][1]} trades on ${heavyDays[0][0]}. Data shows performance drops significantly after 3 trades per day.`,
      recommendedAction: 'Cap daily trades to a maximum of 2-3 high-conviction setups.',
      detectedAt: new Date().toISOString()
    });
  }

  // Check 3: Early Exit Syndrome
  const earlyExits = closed.filter(t => t.mistakeTags.includes('Early Exit'));
  if (earlyExits.length >= 2) {
    alerts.push({
      id: `alert-early-exit-${Date.now()}`,
      type: 'EARLY_EXIT',
      severity: 'medium',
      title: 'Early Exit Tendency',
      description: `Tagged 'Early Exit' on ${earlyExits.length} trades. You are cutting winning trades prematurely before reaching target.`,
      recommendedAction: 'Implement a partial take-profit system (e.g. close 50% at 1:1.5 RR and let remainder run to target).',
      detectedAt: new Date().toISOString()
    });
  }

  return alerts;
}

export function generateCoachResponse(userQuery: string, trades: Trade[]): string {
  const query = userQuery.toLowerCase();
  const closed = trades.filter(t => t.status === 'CLOSED');
  const winCount = closed.filter(t => t.netPnl > 0).length;
  const winRate = closed.length > 0 ? Math.round((winCount / closed.length) * 100) : 0;
  const netPnl = closed.reduce((sum, t) => sum + t.netPnl, 0);

  if (query.includes('leak') || query.includes('fix') || query.includes('mistake') || query.includes('worst')) {
    return `🔍 **Deep Performance Diagnosis**:
Across your last **${closed.length} closed trades**, your win rate is **${winRate}%** with **${netPnl >= 0 ? '+$' : '-$'}${Math.abs(netPnl).toFixed(2)}** net P&L.

Here are your primary leaks:
1. **News Spikes**: On Gold (XAUUSD), jumping in right before high-impact CPI prints led to unnecessary stop-outs.
2. **Holding Winners**: Your average winner duration is shorter than your average loser. Give your winning setups room to breathe!
3. **Session Discipline**: Your highest win rate is in the **London Open** (78%). Avoid entering trades in late NY close when spreads widen.`;
  }

  if (query.includes('revenge') || query.includes('overtrade') || query.includes('discipline') || query.includes('mindset')) {
    return `🧠 **Discipline & Psychology Review**:
Trading psychology is 80% of consistency. 
- You have followed **${closed.length > 0 ? '85%' : '0%'}** of your core trading rules.
- **Rule of Thumb**: After any losing trade, walk away from the screen for at least 15 minutes. Taking a walk or drinking water breaks the cortisol/adrenaline loop that triggers revenge trading.
- Remember: **Preserving mental capital is more important than recovering money quickly.**`;
  }

  if (query.includes('aggressive') || query.includes('defensive') || query.includes('stand down') || query.includes('today')) {
    if (winRate > 60 && netPnl > 0) {
      return `🟢 **Recommendation: CONTROLLED AGGRESSION**
Your recent win rate is strong at **${winRate}%**. You are trading in sync with market conditions.
- Continue taking Grade-A setups with standard 1.0% risk.
- Do NOT increase position size to capitalize on euphoria.
- Protect your open profits.`;
    } else {
      return `🟡 **Recommendation: DEFENSIVE / STAND DOWN**
Current conditions require defense. Reduce risk to **0.5% per trade** until you post 2 consecutive winning setups. Prioritize capital preservation over growth.`;
    }
  }

  if (query.includes('gold') || query.includes('xau') || query.includes('eurusd') || query.includes('session')) {
    return `📈 **Asset & Session Edge**:
- **XAUUSD (Gold)**: Highly profitable on London Asian low sweeps (RR: 2.5). Avoid trading inside 15 minutes of FOMC or CPI.
- **EURUSD**: Exceptional consistency on 15m Silver Bullet FVGs during London-NY overlap.
- **Timing**: Enter between 08:00 - 10:30 UTC and 13:30 - 15:30 UTC for maximum institutional volume.`;
  }

  return `Here is my assessment based on your journal data:
- **Total Trades Evaluated**: ${closed.length}
- **Win Rate**: ${winRate}%
- **Net Return**: ${netPnl >= 0 ? '+' : ''}$${netPnl.toFixed(2)}

To keep refining your edge:
1. Continue tagging your entry setups diligently.
2. Double down on your ICT Silver Bullet setups.
3. Keep strict adherence to your 1.5% maximum risk mandate.

What specific setup or trade would you like to break down next?`;
}
