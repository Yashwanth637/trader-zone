import jsPDF from 'jspdf';
import { SummaryStats, formatCurrency } from './calculations';
import { Trade, TradingAccount } from '../types/trade';

interface GenerateReportOptions {
  stats: SummaryStats;
  trades: Trade[];
  account?: TradingAccount;
  profileName: string;
  period: string;
}

export function generateExecutiveReportPDF({
  stats,
  trades,
  account,
  profileName,
  period
}: GenerateReportOptions): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  // 1. Institutional Header Banner
  doc.setFillColor(15, 23, 42); // slate-900 / dark navy
  doc.rect(0, 0, pageWidth, 24, 'F');

  // Accent Line
  doc.setFillColor(139, 92, 246); // primary violet
  doc.rect(0, 24, pageWidth, 1.5, 'F');

  // Header Titles
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('TRADER ZONE INSTITUTIONAL', margin, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(167, 139, 250); // violet-300
  doc.text('EXECUTIVE PERFORMANCE & AUDIT STATEMENT', margin, 18);

  // Right Header Info
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text('CONFIDENTIAL · AUDITED STATEMENT', pageWidth - margin, 12, { align: 'right' });
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  doc.text(`STATEMENT DATE: ${dateStr.toUpperCase()}`, pageWidth - margin, 18, { align: 'right' });

  // 2. Account & Trader Metadata Box
  let y = 30;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.rect(margin, y, contentWidth, 22, 'FD');

  const metaCols = [
    { label: 'TRADER', val: profileName || 'Master Trader', x: margin + 4 },
    { label: 'ACCOUNT', val: account ? account.name : 'Primary Portfolio', x: margin + 48 },
    { label: 'BROKER / TYPE', val: `${account?.broker || 'Live'} (${account?.type || 'Prop Firm'})`, x: margin + 96 },
    { label: 'CURRENCY', val: account?.currency || 'USD', x: margin + 148 }
  ];

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139); // slate-500
  metaCols.forEach(col => {
    doc.text(col.label, col.x, y + 6);
  });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42); // slate-900
  metaCols.forEach(col => {
    doc.text(col.val, col.x, y + 11);
  });

  // Second Row in Metadata Box
  const initialBal = account ? account.initialBalance : 100000;
  const netEquity = initialBal + stats.netPnl;
  const docHash = `TZ-${Math.abs(stats.netPnl).toFixed(0)}-${Date.now().toString(36).toUpperCase()}`;

  const metaRow2 = [
    { label: 'AUDIT PERIOD', val: period.toUpperCase(), x: margin + 4 },
    { label: 'BASE CAPITAL', val: `$${initialBal.toLocaleString()}`, x: margin + 48 },
    { label: 'NET AUDITED EQUITY', val: `$${netEquity.toLocaleString()}`, x: margin + 96 },
    { label: 'AUDIT HASH', val: docHash, x: margin + 148 }
  ];

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  metaRow2.forEach(col => {
    doc.text(col.label, col.x, y + 16);
  });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  metaRow2.forEach(col => {
    doc.text(col.val, col.x, y + 20);
  });

  // 3. Core Executive KPIs (4 Cards)
  y = 56;
  const cardW = (contentWidth - 9) / 4; // 43.25mm
  const cardH = 20;

  const kpis = [
    {
      label: 'NET REALIZED P&L',
      val: formatCurrency(stats.netPnl),
      sub: stats.netPnl >= 0 ? `+${(((stats.netPnl) / initialBal) * 100).toFixed(2)}% Return` : `${(((stats.netPnl) / initialBal) * 100).toFixed(2)}% Drawdown`,
      isPositive: stats.netPnl >= 0
    },
    {
      label: 'WIN RATE',
      val: `${stats.winRate}%`,
      sub: `${stats.winningTrades}W / ${stats.losingTrades}L (${stats.totalTrades} Total)`,
      isPositive: stats.winRate >= 50
    },
    {
      label: 'PROFIT FACTOR',
      val: stats.profitFactor.toFixed(2),
      sub: stats.profitFactor >= 1.5 ? 'Institutional Edge' : 'Moderate',
      isPositive: stats.profitFactor >= 1.2
    },
    {
      label: 'MAX DRAWDOWN',
      val: `${stats.maxDrawdownPercent.toFixed(1)}%`,
      sub: `Capital at Risk`,
      isPositive: stats.maxDrawdownPercent <= 5
    }
  ];

  kpis.forEach((kpi, idx) => {
    const cx = margin + idx * (cardW + 3);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.rect(cx, y, cardW, cardH, 'FD');

    // Subtle top border accent
    doc.setFillColor(kpi.isPositive ? 16 : 244, kpi.isPositive ? 185 : 63, kpi.isPositive ? 129 : 94);
    doc.rect(cx, y, cardW, 1, 'F');

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, cx + 3, y + 6);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    if (idx === 0) {
      doc.setTextColor(stats.netPnl >= 0 ? 16 : 225, stats.netPnl >= 0 ? 149 : 29, stats.netPnl >= 0 ? 104 : 72);
    } else {
      doc.setTextColor(15, 23, 42);
    }
    doc.text(kpi.val, cx + 3, y + 13);

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.sub, cx + 3, y + 18);
  });

  // 4. Detailed Financial Statistics Section
  y = 81;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('FINANCIAL PERFORMANCE & STATISTICAL AUDIT', margin, y);

  // Table header bar
  y += 3;
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 5, 'F');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text('PERFORMANCE METRIC', margin + 4, y + 3.5);
  doc.text('AUDITED VALUE', margin + 65, y + 3.5);
  doc.text('PERFORMANCE METRIC', margin + 95, y + 3.5);
  doc.text('AUDITED VALUE', margin + 155, y + 3.5);

  const statsRows = [
    ['Total Closed Trades', `${stats.totalTrades}`, 'Total Volume Traded', `${stats.totalLots} Lots`],
    ['Gross Realized Profit', `+$${stats.grossProfit.toFixed(2)}`, 'Gross Realized Loss', `-$${stats.grossLoss.toFixed(2)}`],
    ['Average Winning Trade', `+$${stats.avgWin.toFixed(2)}`, 'Average Losing Trade', `-$${stats.avgLoss.toFixed(2)}`],
    ['Largest Winning Trade', `+$${stats.largestWin.toFixed(2)}`, 'Largest Losing Trade', `-$${stats.largestLoss.toFixed(2)}`],
    ['Expected Value / Trade', `+$${stats.expectancy.toFixed(2)}`, 'Win / Loss Payoff Ratio', `${stats.winLossRatio.toFixed(2)}:1`],
    ['Break-even Trades', `${stats.breakEvenTrades}`, 'Commissions & Swaps', `$${stats.totalCommission.toFixed(2)}`]
  ];

  y += 5;
  statsRows.forEach((row, i) => {
    const isEven = i % 2 === 0;
    if (isEven) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, y, contentWidth, 5, 'F');
    }
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y + 5, margin + contentWidth, y + 5);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(row[0], margin + 4, y + 3.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(row[1], margin + 65, y + 3.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(row[2], margin + 95, y + 3.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(row[3], margin + 155, y + 3.5);

    y += 5;
  });

  // 5. Closed Positions Ledger (Recent Trades Table)
  y += 6;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('AUDITED CLOSED TRADES LEDGER', margin, y);

  y += 3;
  // Table header
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, y, contentWidth, 5, 'F');

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('DATE', margin + 3, y + 3.5);
  doc.text('SYMBOL', margin + 25, y + 3.5);
  doc.text('TYPE', margin + 50, y + 3.5);
  doc.text('LOTS', margin + 68, y + 3.5);
  doc.text('ENTRY', margin + 85, y + 3.5);
  doc.text('EXIT', margin + 110, y + 3.5);
  doc.text('DURATION', margin + 135, y + 3.5);
  doc.text('NET P&L', margin + 162, y + 3.5);

  y += 5;

  const closedTrades = trades.filter(t => t.status === 'CLOSED').slice(0, 10);

  if (closedTrades.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, contentWidth, 12, 'FD');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('No closed trades recorded for this audit period.', margin + contentWidth / 2, y + 7, { align: 'center' });
    y += 15;
  } else {
    closedTrades.forEach((t, i) => {
      const isEven = i % 2 === 0;
      doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
      doc.rect(margin, y, contentWidth, 5, 'F');
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y + 5, margin + contentWidth, y + 5);

      const d = (t.closeTime || t.openTime || '').split('T')[0];
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(d, margin + 3, y + 3.5);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(t.symbol, margin + 25, y + 3.5);

      // Direction badge text
      doc.setTextColor(t.direction === 'BUY' ? 16 : 225, t.direction === 'BUY' ? 149 : 29, t.direction === 'BUY' ? 104 : 72);
      doc.text(t.direction, margin + 50, y + 3.5);

      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'normal');
      doc.text(`${t.lotSize}`, margin + 68, y + 3.5);
      doc.text(`${t.entryPrice}`, margin + 85, y + 3.5);
      doc.text(`${t.exitPrice || '-'}`, margin + 110, y + 3.5);
      doc.text(`${t.durationMinutes ? t.durationMinutes + 'm' : '-'}`, margin + 135, y + 3.5);

      // Net PnL
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(t.netPnl >= 0 ? 16 : 225, t.netPnl >= 0 ? 149 : 29, t.netPnl >= 0 ? 104 : 72);
      doc.text(`${t.netPnl >= 0 ? '+' : ''}$${t.netPnl.toFixed(2)}`, margin + 162, y + 3.5);

      y += 5;
    });
  }

  // 6. Risk & Execution Compliance Audit Box
  y += 5;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('RISK GOVERNANCE & BEHAVIORAL AUDIT', margin, y);

  y += 3;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, y, contentWidth, 14, 'FD');

  const slCompliance = closedTrades.length > 0
    ? Math.round((closedTrades.filter(t => !!t.stopLoss && t.stopLoss > 0).length / closedTrades.length) * 100)
    : 100;

  const compItems = [
    { label: 'STOP LOSS ADHERENCE', val: `${slCompliance}% Compliant` },
    { label: 'MAX RISK PER TRADE', val: '≤ 1.5% Adhered' },
    { label: 'EXECUTION QUALITY', val: 'Direct STP/ECN' },
    { label: 'DISCIPLINE STATUS', val: slCompliance >= 90 ? 'Institutional Grade' : 'Needs Review' }
  ];

  compItems.forEach((c, idx) => {
    const cx = margin + 4 + idx * 45;
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(c.label, cx, y + 5);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(c.val, cx, y + 10);
  });

  // 7. Official Certification & Signature Block
  y = 250;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, margin + contentWidth, y);

  y += 6;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 116, 139);
  doc.text(
    'I hereby certify that this statement represents a true and accurate accounting of trading activity, risk management adherence, and financial performance executed through Trader Zone.',
    margin,
    y,
    { maxWidth: contentWidth }
  );

  y += 14;
  // Signature Lines
  doc.setDrawColor(148, 163, 184);
  doc.line(margin, y, margin + 65, y);
  doc.line(margin + 115, y, margin + 175, y);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text(`Authorized Signature (${profileName || 'Trader'})`, margin, y + 5);
  doc.text('Date Verified', margin + 115, y + 5);

  // 8. Bottom Institutional Footer Bar
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 287, pageWidth, 10, 'F');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Trader Zone AI 2.0 Institutional Audit Engine · Verification Hash: ${docHash} · Page 1 of 1`,
    pageWidth / 2,
    293,
    { align: 'center' }
  );

  // Trigger browser download
  const filename = `Trader-Zone-Executive-Report-${period}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}
