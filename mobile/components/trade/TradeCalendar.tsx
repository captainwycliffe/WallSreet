import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ArrowLeftRight } from 'lucide-react-native';
import { Trade } from '../../types/trade';

const C = {
  bg: '#0A0A0F',
  surface: '#12121A',
  surface2: '#1C1C28',
  border: '#2A2A3A',
  green: '#00C896',
  greenBg: 'rgba(0, 200, 150, 0.12)',
  red: '#FF4757',
  redBg: 'rgba(255, 71, 87, 0.12)',
  white: '#FFFFFF',
  textSecondary: '#8888A8',
  textMuted: '#555577',
  accent: '#00D4FF',
  gold: '#FFD700',
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface DayTradeSummary {
  dateStr: string;
  dayNumber: number;
  trades: Trade[];
  count: number;
  totalProfit: number;
  winCount: number;
  lossCount: number;
}

interface WeekSummary {
  title: string;
  dateRange: string;
  totalProfit: number;
  daysCount: number;
  tradesCount: number;
}

interface TradeCalendarProps {
  trades: Trade[];
  onSelectTrade?: (trade: Trade) => void;
  selectedDate?: string | null;
  onSelectDate?: (dateStr: string | null) => void;
}

export function TradeCalendar({
  trades,
  onSelectTrade,
  selectedDate,
  onSelectDate,
}: TradeCalendarProps) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [internalSelectedDate, setInternalSelectedDate] = useState<string | null>(null);

  const selectedDateStr = selectedDate !== undefined ? selectedDate : internalSelectedDate;
  const updateSelectedDate = (val: string | null) => {
    if (onSelectDate) onSelectDate(val);
    else setInternalSelectedDate(val);
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-indexed

  // Format YYYY-MM
  const currentMonthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

  // Helper to extract YYYY-MM-DD safely
  const getTradeDateStr = (trade: Trade): string => {
    const raw = trade.closed_at || trade.opened_at;
    if (!raw) return '';
    try {
      const d = new Date(raw);
      if (isNaN(d.getTime())) return '';
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    } catch {
      return '';
    }
  };

  // Group trades by date string
  const tradesByDate = useMemo(() => {
    const map = new Map<string, DayTradeSummary>();
    if (!trades) return map;

    trades.forEach((trade) => {
      const dateStr = getTradeDateStr(trade);
      if (!dateStr) return;

      const parts = dateStr.split('-');
      const dayNum = parseInt(parts[2], 10);
      const profit = trade.profit ?? 0;

      const existing = map.get(dateStr) || {
        dateStr,
        dayNumber: dayNum,
        trades: [],
        count: 0,
        totalProfit: 0,
        winCount: 0,
        lossCount: 0,
      };

      existing.trades.push(trade);
      existing.count += 1;
      existing.totalProfit += profit;
      if (profit >= 0) existing.winCount += 1;
      else existing.lossCount += 1;

      map.set(dateStr, existing);
    });

    return map;
  }, [trades]);

  // Days in selected month
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Summary for the visible month
  const monthStats = useMemo(() => {
    let totalProfit = 0;
    let daysWithTrades = 0;
    let totalTrades = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentMonthKey}-${String(day).padStart(2, '0')}`;
      const summary = tradesByDate.get(dateStr);
      if (summary && summary.count > 0) {
        totalProfit += summary.totalProfit;
        daysWithTrades += 1;
        totalTrades += summary.count;
      }
    }

    return { totalProfit, daysWithTrades, totalTrades };
  }, [currentMonthKey, daysInMonth, tradesByDate]);

  // Weekly breakdown calculation
  const weeklySummaries = useMemo<WeekSummary[]>(() => {
    const weeks: WeekSummary[] = [];
    const weekLabels = ['Week One', 'Week Two', 'Week Three', 'Week Four', 'Week Five', 'Week Six'];

    let startDay = 1;
    let weekIndex = 0;

    while (startDay <= daysInMonth) {
      const currentWeekStart = startDay;
      const dayOfWeekOfStart = new Date(year, month, currentWeekStart).getDay();
      const daysUntilSat = 6 - dayOfWeekOfStart;
      const endDay = Math.min(daysInMonth, currentWeekStart + daysUntilSat);

      let weekProfit = 0;
      let weekDays = 0;
      let weekTrades = 0;

      for (let d = currentWeekStart; d <= endDay; d++) {
        const dateStr = `${currentMonthKey}-${String(d).padStart(2, '0')}`;
        const sum = tradesByDate.get(dateStr);
        if (sum && sum.count > 0) {
          weekProfit += sum.totalProfit;
          weekDays += 1;
          weekTrades += sum.count;
        }
      }

      const monthShort = MONTH_NAMES[month].slice(0, 3);
      weeks.push({
        title: weekLabels[weekIndex] || `Week ${weekIndex + 1}`,
        dateRange: `${monthShort} ${currentWeekStart} - ${monthShort} ${endDay}`,
        totalProfit: weekProfit,
        daysCount: weekDays,
        tradesCount: weekTrades,
      });

      startDay = endDay + 1;
      weekIndex += 1;
    }

    return weeks;
  }, [year, month, daysInMonth, currentMonthKey, tradesByDate]);

  // Navigation handlers
  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
    updateSelectedDate(null);
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
    updateSelectedDate(null);
  };

  const handleToday = () => {
    const now = new Date();
    setViewDate(now);
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    updateSelectedDate(todayStr);
  };

  const today = new Date();
  const isCurrentMonthToday = today.getFullYear() === year && today.getMonth() === month;
  const todayDayNum = today.getDate();

  // Selected day trade items
  const selectedDaySummary = selectedDateStr ? tradesByDate.get(selectedDateStr) : null;

  return (
    <View style={styles.container}>
      {/* ── Top Bar: Month Selector & Month Stats (Matching Inspiration) ── */}
      <View style={styles.topBar}>
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={handlePrevMonth} style={styles.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <ChevronLeft size={20} color={C.white} />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>
            {MONTH_NAMES[month]} {year}
          </Text>
          <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <ChevronRight size={20} color={C.white} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleToday} style={styles.todayBtn}>
            <CalendarIcon size={14} color={C.textSecondary} style={{ marginRight: 4 }} />
            <Text style={styles.todayBtnText}>Today</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.monthSummaryPill}>
          <Text style={styles.monthSummaryLabel}>PnL: </Text>
          <Text style={[styles.monthSummaryPnL, { color: monthStats.totalProfit >= 0 ? C.green : C.red }]}>
            {monthStats.totalProfit >= 0 ? '+' : ''}${monthStats.totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <View style={styles.summaryDivider} />
          <Text style={styles.monthSummaryDays}>Days: <Text style={styles.whiteBold}>{monthStats.daysWithTrades}</Text></Text>
        </View>
      </View>

      {/* ── Calendar Main Card ── */}
      <View style={styles.calendarCard}>
        {/* Weekday Row */}
        <View style={styles.weekdayRow}>
          {WEEKDAYS.map((day) => (
            <Text key={day} style={styles.weekdayText}>
              {day}
            </Text>
          ))}
        </View>

        {/* Days Grid */}
        <View style={styles.grid}>
          {/* Empty spacer cells before month starts */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <View key={`empty-${i}`} style={styles.dayCellEmpty} />
          ))}

          {/* Days of month */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${currentMonthKey}-${String(dayNum).padStart(2, '0')}`;
            const summary = tradesByDate.get(dateStr);
            const hasTrades = summary && summary.count > 0;
            const isProfit = (summary?.totalProfit ?? 0) >= 0;
            const isToday = isCurrentMonthToday && todayDayNum === dayNum;
            const isSelected = selectedDateStr === dateStr;

            return (
              <TouchableOpacity
                key={dateStr}
                activeOpacity={0.7}
                onPress={() => updateSelectedDate(isSelected ? null : dateStr)}
                style={[
                  styles.dayCell,
                  hasTrades && (isProfit ? styles.dayCellProfit : styles.dayCellLoss),
                  isToday && styles.dayCellToday,
                  isSelected && styles.dayCellSelected,
                ]}
              >
                <View style={styles.dayHeader}>
                  <Text style={[styles.dayNumber, isToday && styles.dayNumberToday, isSelected && styles.dayNumberSelected]}>
                    {dayNum}
                  </Text>
                  {hasTrades && (
                    <View style={styles.tradeCountBadge}>
                      <Text style={styles.tradeCountText}>{summary.count}</Text>
                      <ArrowLeftRight size={8} color={C.textSecondary} style={{ marginLeft: 1 }} />
                    </View>
                  )}
                </View>

                {hasTrades ? (
                  <View style={styles.dayPnLContainer}>
                    <Text
                      style={[styles.dayPnLText, { color: isProfit ? C.green : C.red }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {isProfit ? '+' : ''}${Math.abs(summary.totalProfit) >= 1000
                        ? `${(summary.totalProfit / 1000).toFixed(1)}k`
                        : summary.totalProfit.toFixed(0)}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.dayPnLEmpty} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Selected Day Trade Details (Shown when a day is tapped) ── */}
      {selectedDaySummary && selectedDaySummary.trades.length > 0 && (
        <View style={styles.selectedDayBox}>
          <View style={styles.selectedDayHeader}>
            <Text style={styles.selectedDayTitle}>
              {selectedDaySummary.dateStr} · {selectedDaySummary.count} Trade{selectedDaySummary.count > 1 ? 's' : ''}
            </Text>
            <Text style={[styles.selectedDayProfit, { color: selectedDaySummary.totalProfit >= 0 ? C.green : C.red }]}>
              {selectedDaySummary.totalProfit >= 0 ? '+' : ''}${selectedDaySummary.totalProfit.toFixed(2)}
            </Text>
          </View>

          {selectedDaySummary.trades.map((t) => {
            const isBuy = t.direction === 'BUY';
            const prof = t.profit ?? 0;
            return (
              <TouchableOpacity
                key={t.id}
                style={styles.dayTradeRow}
                activeOpacity={0.7}
                onPress={() => onSelectTrade?.(t)}
              >
                <View style={styles.tradeLeft}>
                  <View style={[styles.dirPill, { backgroundColor: isBuy ? 'rgba(0, 200, 150, 0.15)' : 'rgba(255, 71, 87, 0.15)' }]}>
                    <Text style={[styles.dirText, { color: isBuy ? C.green : C.red }]}>{t.direction}</Text>
                  </View>
                  <View style={{ marginLeft: 8 }}>
                    <Text style={styles.tradeSymbol}>{t.symbol}</Text>
                    <Text style={styles.tradeMeta}>Vol: {Number(parseFloat(String(t.volume)).toFixed(4))} · #{t.mt5_ticket}</Text>
                  </View>
                </View>

                <View style={styles.tradeRight}>
                  <Text style={[styles.tradeProfit, { color: prof >= 0 ? C.green : C.red }]}>
                    {prof >= 0 ? '+' : ''}${prof.toFixed(2)}
                  </Text>
                  <Text style={styles.tradeStatus}>{t.status}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* ── Weekly Summary Breakdown (Matching Inspiration Right Sidebar) ── */}
      <View style={styles.weeklySection}>
        <Text style={styles.weeklySectionTitle}>Weekly Summary</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weeklyScroll}>
          {weeklySummaries.map((wk, idx) => {
            const hasTrades = wk.tradesCount > 0;
            const isProfit = wk.totalProfit >= 0;

            return (
              <View key={idx} style={styles.weekCard}>
                <View style={styles.weekCardHeader}>
                  <Text style={styles.weekCardTitle}>{wk.title}</Text>
                  <Text style={styles.weekCardDateRange}>{wk.dateRange}</Text>
                </View>

                {hasTrades ? (
                  <View style={styles.weekCardBody}>
                    <View style={styles.weekPnLRow}>
                      <Text style={styles.weekPnLLabel}>PnL: </Text>
                      <Text style={[styles.weekPnLValue, { color: isProfit ? C.green : C.red }]}>
                        {isProfit ? '+' : ''}${wk.totalProfit.toFixed(2)}
                      </Text>
                    </View>
                    <Text style={styles.weekDaysText}>Days: <Text style={styles.whiteBold}>{wk.daysCount}</Text></Text>
                  </View>
                ) : (
                  <Text style={styles.weekNoTrades}>No trades</Text>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navBtn: {
    padding: 6,
    backgroundColor: C.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  monthTitle: {
    color: C.white,
    fontSize: 16,
    fontWeight: '700',
    marginHorizontal: 10,
  },
  todayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface2,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    marginLeft: 6,
  },
  todayBtnText: {
    color: C.white,
    fontSize: 12,
    fontWeight: '500',
  },
  monthSummaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  monthSummaryLabel: {
    color: C.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  monthSummaryPnL: {
    fontSize: 13,
    fontWeight: '700',
  },
  summaryDivider: {
    width: 1,
    height: 12,
    backgroundColor: C.border,
    marginHorizontal: 8,
  },
  monthSummaryDays: {
    color: C.textSecondary,
    fontSize: 12,
  },
  whiteBold: {
    color: C.white,
    fontWeight: '600',
  },

  // ── Calendar Card ──
  calendarCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 10,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 8,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A26',
  },
  weekdayText: {
    width: '14.28%',
    textAlign: 'center',
    color: C.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCellEmpty: {
    width: '14.28%',
    height: 52,
  },
  dayCell: {
    width: '14.28%',
    height: 52,
    borderWidth: 1,
    borderColor: '#191926',
    borderRadius: 8,
    padding: 3,
    justifyContent: 'space-between',
    backgroundColor: '#0E0E16',
  },
  dayCellProfit: {
    backgroundColor: 'rgba(0, 200, 150, 0.08)',
    borderColor: 'rgba(0, 200, 150, 0.3)',
  },
  dayCellLoss: {
    backgroundColor: 'rgba(255, 71, 87, 0.08)',
    borderColor: 'rgba(255, 71, 87, 0.3)',
  },
  dayCellToday: {
    borderColor: C.accent,
    borderWidth: 1.5,
  },
  dayCellSelected: {
    borderColor: C.gold,
    borderWidth: 2,
    backgroundColor: '#1C1C28',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayNumber: {
    color: C.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  dayNumberToday: {
    color: C.accent,
    fontWeight: '800',
  },
  dayNumberSelected: {
    color: C.gold,
    fontWeight: '800',
  },
  tradeCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface2,
    paddingHorizontal: 2,
    borderRadius: 4,
  },
  tradeCountText: {
    color: C.white,
    fontSize: 8,
    fontWeight: '700',
  },
  dayPnLContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPnLText: {
    fontSize: 9,
    fontWeight: '700',
  },
  dayPnLEmpty: {
    height: 12,
  },

  // ── Selected Day Box ──
  selectedDayBox: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.gold,
    padding: 12,
    marginTop: 12,
  },
  selectedDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    marginBottom: 8,
  },
  selectedDayTitle: {
    color: C.white,
    fontSize: 14,
    fontWeight: '600',
  },
  selectedDayProfit: {
    fontSize: 15,
    fontWeight: '700',
  },
  dayTradeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A28',
  },
  tradeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dirPill: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  dirText: {
    fontSize: 10,
    fontWeight: '700',
  },
  tradeSymbol: {
    color: C.white,
    fontSize: 13,
    fontWeight: '600',
  },
  tradeMeta: {
    color: C.textSecondary,
    fontSize: 11,
  },
  tradeRight: {
    alignItems: 'flex-end',
  },
  tradeProfit: {
    fontSize: 13,
    fontWeight: '700',
  },
  tradeStatus: {
    color: C.textMuted,
    fontSize: 10,
  },

  // ── Weekly Summary ──
  weeklySection: {
    marginTop: 16,
  },
  weeklySectionTitle: {
    color: C.white,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  weeklyScroll: {
    gap: 10,
  },
  weekCard: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    minWidth: 170,
  },
  weekCardHeader: {
    marginBottom: 8,
  },
  weekCardTitle: {
    color: C.white,
    fontSize: 13,
    fontWeight: '600',
  },
  weekCardDateRange: {
    color: C.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  weekCardBody: {
    flexDirection: 'column',
    gap: 4,
  },
  weekPnLRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weekPnLLabel: {
    color: C.textSecondary,
    fontSize: 12,
  },
  weekPnLValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  weekDaysText: {
    color: C.textSecondary,
    fontSize: 11,
  },
  weekNoTrades: {
    color: C.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
});
