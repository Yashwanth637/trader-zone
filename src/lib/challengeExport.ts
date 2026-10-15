import jsPDF from 'jspdf';
import { Trade, HundredTradesChallenge } from '../types/trade';
import { formatCurrency } from './calculations';

export function inferClosedBy(trade: Trade): 'TP' | 'SL' | 'User' {
  if (trade.closedBy) return trade.closedBy;
  if (!trade.exitPrice) return 'User';

  const exit = trade.exitPrice;
  const entry = trade.entryPrice;
  const isBuy = trade.direction === 'BUY';

  if (trade.takeProfit) {
    const tp = trade.takeProfit;
    const diff = Math.abs(exit - tp);
    const relDiff = tp !== 0 ? diff / tp : 0;
    if (isBuy && exit >= tp * 0.9995) return 'TP';
    if (!isBuy && exit <= tp * 1.0005) return 'TP';
    if (relDiff < 0.001) return 'TP';
  }

  if (trade.stopLoss) {
    const sl = trade.stopLoss;
    const diff = Math.abs(exit - sl);
    const relDiff = sl !== 0 ? diff / sl : 0;
    if (isBuy && exit <= sl * 1.0005) return 'SL';
    if (!isBuy && exit >= sl * 0.9995) return 'SL';
    if (relDiff < 0.001) return 'SL';
  }

  return 'User';
}

/**
 * Exports the 100 Trades Challenge as an Excel-compatible column-wise CSV file with UTF-8 BOM
 */
export function export100TradesExcel(
  challenge: HundredTradesChallenge,
  trades: Trade[],
  accountLabel: string
): void {
  const headers = [
    'Trade #',
    'Open Date & Time',
    'Symbol',
    'Direction',
    'Lot Size',
    'Entry Price',
    'Exit Price',
    'Stop Loss',
    'Take Profit',
    'Closed By',
    'Star Rating (1-5)',
    'Net P&L ($)',
    'Realized R:R',
    'Planned R:R',
    'Emotional State',
    'Mistakes Noticed',
    'Strategy / Setup',
    'Notes'
  ];

  const rows = trades.map((t, idx) => {
    const tradeNum = idx + 1;
    const openDate = t.openTime ? new Date(t.openTime).toISOString().replace('T', ' ').slice(0, 19) : '';
    const closedBy = inferClosedBy(t);
    const starRating = t.executionRating ?? (t.netPnl >= 0 ? 5 : 3);
    const realizedRR = t.realizedRR !== undefined ? `${t.realizedRR}R` : '-';
    const plannedRR = t.plannedRR !== undefined ? `1:${t.plannedRR}` : '-';
    const mistakes = (t.mistakeTags || []).join('; ');
    const setups = (t.setupTags || []).join('; ');
    const cleanNotes = (t.notes || '').replace(/"/g, '""').replace(/\n/g, ' ');

    return [
      tradeNum,
      openDate,
      t.symbol,
      t.direction,
      t.lotSize,
      t.entryPrice,
      t.exitPrice ?? 'Running',
      t.stopLoss ?? '-',
      t.takeProfit ?? '-',
      closedBy,
      starRating,
      t.netPnl.toFixed(2),
      realizedRR,
      plannedRR,
      t.emotionalState || 'Disciplined',
      mistakes ? `"${mistakes}"` : '-',
      setups ? `"${setups}"` : (t.strategyName || '-'),
      cleanNotes ? `"${cleanNotes}"` : '-'
    ];
  });

  const csvContent = '\uFEFF' + [
    `# 100 TRADES DISCIPLINE & PSYCHOLOGY CHALLENGE`,
    `# Challenge: ${challenge.name} | Account: ${accountLabel} | Start Date: ${challenge.startDate} | Generated: ${new Date().toISOString()}`,
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const cleanName = challenge.name.replace(/[^a-zA-Z0-9]/g, '_');
  link.setAttribute('download', `100_Trades_Challenge_${cleanName}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates an audited column-wise PDF for the 100 Trades Challenge using jsPDF
 */
export function export100TradesPDF(
  challenge: HundredTradesChallenge,
  trades: Trade[],
  accountLabel: string
): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 12;
  const contentWidth = pageWidth - margin * 2; // 273mm

  // Challenge metrics
  const totalCompleted = trades.length;
  const wins = trades.filter(t => t.netPnl > 0.01).length;
  const losses = trades.filter(t => t.netPnl < -0.01).length;
  const winRate = totalCompleted > 0 ? ((wins / totalCompleted) * 100).toFixed(1) : '0.0';
  const totalPnl = trades.reduce((sum, t) => sum + (t.netPnl || 0), 0);
  const tpCount = trades.filter(t => inferClosedBy(t) === 'TP').length;
  const slCount = trades.filter(t => inferClosedBy(t) === 'SL').length;
  const userCount = trades.filter(t => inferClosedBy(t) === 'User').length;
  const avgStars = totalCompleted > 0
    ? (trades.reduce((sum, t) => sum + (t.executionRating ?? 4), 0) / totalCompleted).toFixed(1)
    : '0.0';

  let y = 0;

  // Header Banner (Navy slate-900)
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 22, 'F');

  // Accent Line (Cyan)
  doc.setFillColor(6, 182, 212);
  doc.rect(0, 22, pageWidth, 1.2, 'F');

  // Header Text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('100 TRADES DISCIPLINE & PSYCHOLOGY CHALLENGE', margin, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`CHALLENGE: ${challenge.name.toUpperCase()}  |  ACCOUNT: ${accountLabel.toUpperCase()}  |  START DATE: ${challenge.startDate}`, margin, 17);

  // Right Top Header Info
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text('OFFICIAL TRADER RECORD STATEMENT', pageWidth - margin, 11, { align: 'right' });
  doc.text(`PRINTED: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).toUpperCase()}`, pageWidth - margin, 17, { align: 'right' });

  y = 28;

  // 4 Top KPI Cards
  const cardW = (contentWidth - 9) / 4;
  const cardH = 15;

  // Card 1: Progress
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, cardW, cardH, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('CHALLENGE PROGRESS', margin + 3, y + 5);
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`${totalCompleted} / 100 Trades (${Math.round((totalCompleted / 100) * 100)}%)`, margin + 3, y + 11.5);

  // Card 2: Net P&L & Win Rate
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin + cardW + 3, y, cardW, cardH, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('WIN RATE & REALIZED P&L', margin + cardW + 6, y + 5);
  doc.setFontSize(11);
  doc.setTextColor(totalPnl >= 0 ? 16 : 225, totalPnl >= 0 ? 185 : 29, totalPnl >= 0 ? 129 : 72);
  doc.text(`${winRate}%  (${formatCurrency(totalPnl)})`, margin + cardW + 6, y + 11.5);

  // Card 3: Closed By Distribution
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin + (cardW + 3) * 2, y, cardW, cardH, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('CLOSED BY BREAKDOWN', margin + (cardW + 3) * 2 + 3, y + 5);
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`TP: ${tpCount} (Green)  |  SL: ${slCount} (Red)  |  User: ${userCount} (Black)`, margin + (cardW + 3) * 2 + 3, y + 11.5);

  // Card 4: Star Rating
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin + (cardW + 3) * 3, y, cardW, cardH, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('AVG EXECUTION / DISCIPLINE', margin + (cardW + 3) * 3 + 3, y + 5);
  doc.setFontSize(11);
  doc.setTextColor(217, 119, 6); // amber-600
  doc.text(`${avgStars} / 5.0 Stars`, margin + (cardW + 3) * 3 + 3, y + 11.5);

  y += cardH + 6;

  // Table Columns configuration
  // Total width: 273mm
  const cols = [
    { header: '#', width: 9, align: 'left' as const },
    { header: 'DATE / TIME', width: 26, align: 'left' as const },
    { header: 'SYMBOL', width: 18, align: 'left' as const },
    { header: 'SIDE', width: 12, align: 'center' as const },
    { header: 'LOTS', width: 12, align: 'right' as const },
    { header: 'ENTRY', width: 18, align: 'right' as const },
    { header: 'EXIT', width: 18, align: 'right' as const },
    { header: 'STOP LOSS', width: 18, align: 'right' as const },
    { header: 'TAKE PROFIT', width: 18, align: 'right' as const },
    { header: 'CLOSED BY', width: 22, align: 'center' as const },
    { header: 'STARS', width: 16, align: 'center' as const },
    { header: 'NET P&L', width: 20, align: 'right' as const },
    { header: 'R:R', width: 14, align: 'center' as const },
    { header: 'PSYCHOLOGY & MISTAKES', width: 52, align: 'left' as const }
  ];

  const renderTableHeader = (currentY: number) => {
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(margin, currentY, contentWidth, 7, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(241, 245, 249);

    let curX = margin;
    cols.forEach(col => {
      const textX = col.align === 'right'
        ? curX + col.width - 2
        : col.align === 'center'
        ? curX + col.width / 2
        : curX + 2;
      doc.text(col.header, textX, currentY + 4.8, { align: col.align });
      curX += col.width;
    });

    return currentY + 7;
  };

  y = renderTableHeader(y);

  const rowHeight = 6.2;

  trades.forEach((t, idx) => {
    // Check page overflow
    if (y + rowHeight > pageHeight - 12) {
      doc.addPage();
      y = 12;
      y = renderTableHeader(y);
    }

    // Alternating row background
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
    }

    const tradeNum = `#${idx + 1}`;
    const dateStr = t.openTime
      ? new Date(t.openTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
      : '-';
    const side = t.direction;
    const lots = t.lotSize ? t.lotSize.toString() : '1.0';
    const entry = t.entryPrice ? t.entryPrice.toFixed(2) : '-';
    const exit = t.exitPrice ? t.exitPrice.toFixed(2) : (t.status === 'OPEN' ? 'Running' : '-');
    const sl = t.stopLoss ? t.stopLoss.toFixed(2) : '-';
    const tp = t.takeProfit ? t.takeProfit.toFixed(2) : '-';
    const closedBy = inferClosedBy(t);
    const starCount = t.executionRating ?? (t.netPnl >= 0 ? 5 : 3);
    const starStr = '★'.repeat(starCount);
    const pnlStr = formatCurrency(t.netPnl);
    const rrStr = t.realizedRR !== undefined ? `${t.realizedRR}R` : t.plannedRR ? `1:${t.plannedRR}` : '-';

    const emotion = t.emotionalState || 'Disciplined';
    const mistake = (t.mistakeTags || []).length > 0 ? ` [${t.mistakeTags.join(', ')}]` : '';
    const psychStr = `${emotion}${mistake}`;

    let curX = margin;

    // Col 1: #
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(tradeNum, curX + 2, y + 4.2);
    curX += cols[0].width;

    // Col 2: Date
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(51, 65, 85);
    doc.text(dateStr, curX + 2, y + 4.2);
    curX += cols[1].width;

    // Col 3: Symbol
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(15, 23, 42);
    doc.text(t.symbol, curX + 2, y + 4.2);
    curX += cols[2].width;

    // Col 4: Side
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    if (side === 'BUY') {
      doc.setTextColor(16, 185, 129); // emerald
    } else {
      doc.setTextColor(239, 68, 68); // rose
    }
    doc.text(side, curX + cols[3].width / 2, y + 4.2, { align: 'center' });
    curX += cols[3].width;

    // Col 5: Lots
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(51, 65, 85);
    doc.text(lots, curX + cols[4].width - 2, y + 4.2, { align: 'right' });
    curX += cols[4].width;

    // Col 6: Entry
    doc.text(entry, curX + cols[5].width - 2, y + 4.2, { align: 'right' });
    curX += cols[5].width;

    // Col 7: Exit
    doc.text(exit, curX + cols[6].width - 2, y + 4.2, { align: 'right' });
    curX += cols[6].width;

    // Col 8: SL
    doc.text(sl, curX + cols[7].width - 2, y + 4.2, { align: 'right' });
    curX += cols[7].width;

    // Col 9: TP
    doc.text(tp, curX + cols[8].width - 2, y + 4.2, { align: 'right' });
    curX += cols[8].width;

    // Col 10: Closed By (TP=Green, SL=Red, User=Black)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    if (closedBy === 'TP') {
      doc.setTextColor(16, 185, 129); // Green
      doc.text('TP (Take Profit)', curX + cols[9].width / 2, y + 4.2, { align: 'center' });
    } else if (closedBy === 'SL') {
      doc.setTextColor(239, 68, 68); // Red
      doc.text('SL (Stop Loss)', curX + cols[9].width / 2, y + 4.2, { align: 'center' });
    } else {
      doc.setTextColor(15, 23, 42); // Black / User
      doc.text('User (Manual)', curX + cols[9].width / 2, y + 4.2, { align: 'center' });
    }
    curX += cols[9].width;

    // Col 11: Stars
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(217, 119, 6); // amber
    doc.text(starStr, curX + cols[10].width / 2, y + 4.2, { align: 'center' });
    curX += cols[10].width;

    // Col 12: Net PnL
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    if (t.netPnl > 0.01) {
      doc.setTextColor(16, 185, 129);
    } else if (t.netPnl < -0.01) {
      doc.setTextColor(239, 68, 68);
    } else {
      doc.setTextColor(100, 116, 139);
    }
    doc.text(pnlStr, curX + cols[11].width - 2, y + 4.2, { align: 'right' });
    curX += cols[11].width;

    // Col 13: R:R
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(71, 85, 105);
    doc.text(rrStr, curX + cols[12].width / 2, y + 4.2, { align: 'center' });
    curX += cols[12].width;

    // Col 14: Psychology & Mistakes
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(51, 65, 85);
    const truncatedPsych = psychStr.length > 38 ? psychStr.slice(0, 36) + '...' : psychStr;
    doc.text(truncatedPsych, curX + 2, y + 4.2);

    y += rowHeight;
  });

  // Footer / Page numbers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `100 TRADES DISCIPLINE CHALLENGE STATEMENT  ·  PAGE ${i} OF ${totalPages}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    );
  }

  const cleanName = challenge.name.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`100_Trades_Challenge_${cleanName}_${new Date().toISOString().split('T')[0]}.pdf`);
}
