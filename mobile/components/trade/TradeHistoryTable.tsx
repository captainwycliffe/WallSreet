import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Share,
} from 'react-native';
import { Share2 } from 'lucide-react-native';
import { Trade } from '../../types/trade';

const C = {
  bg: '#0A0A0F',
  surface: '#12121A',
  surface2: '#1C1C28',
  border: '#2A2A3A',
  headerBg: '#151520',
  rowAltBg: '#14141E',
  green: '#00C896',
  red: '#FF4757',
  white: '#FFFFFF',
  textSecondary: '#8888A8',
  textMuted: '#555577',
};

interface TradeHistoryTableProps {
  trades: Trade[];
  onSelectTrade?: (trade: Trade) => void;
  title?: string;
}

export function TradeHistoryTable({ trades, onSelectTrade, title }: TradeHistoryTableProps) {
  const formatDate = (dateStr?: string | null): string => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '-';
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const y = d.getFullYear();
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${m}/${day}/${y}, ${hh}:${mm}`;
    } catch {
      return '-';
    }
  };

  const formatPrice = (price?: number | null): string => {
    if (price == null || price === 0) return '-';
    return price > 100 ? price.toFixed(2) : price.toFixed(5);
  };

  const formatCommission = (comm?: number | null): string => {
    if (comm == null || comm === 0) return '$0.00';
    return `-$${Math.abs(comm).toFixed(2)}`;
  };

  const formatLots = (vol?: number | string | null): string => {
    if (vol == null) return '-';
    const num = Number(parseFloat(String(vol)).toFixed(4));
    return isNaN(num) ? '-' : String(num);
  };

  const handleShare = async (trade: Trade) => {
    const isProfit = (trade.profit ?? 0) >= 0;
    const pnlFormatted = `${isProfit ? '+' : '-'}$${Math.abs(trade.profit ?? 0).toFixed(2)}`;
    try {
      await Share.share({
        message: `MT5 Monitor Trade: ${trade.symbol} ${trade.direction} ${formatLots(trade.volume)} lots | Profit: ${pnlFormatted} | Open: ${trade.entry_price} | Closed: ${trade.exit_price ?? trade.current_price ?? '-'}`,
      });
    } catch {
      // User cancelled or error
    }
  };

  return (
    <View style={styles.container}>
      {title && (
        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>{title}</Text>
          <Text style={styles.subtitleText}>{trades.length} Records</Text>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.tableScroll}>
        <View style={styles.table}>
          {/* ── Table Header ── */}
          <View style={styles.headerRow}>
            <View style={[styles.cell, styles.colShare]}><Text style={styles.headerText}>Share</Text></View>
            <View style={[styles.cell, styles.colSymbol]}><Text style={styles.headerText}>Symbol</Text></View>
            <View style={[styles.cell, styles.colType]}><Text style={styles.headerText}>Type</Text></View>
            <View style={[styles.cell, styles.colDate]}><Text style={styles.headerText}>Open Date</Text></View>
            <View style={[styles.cell, styles.colPrice]}><Text style={styles.headerText}>Open</Text></View>
            <View style={[styles.cell, styles.colDate]}><Text style={styles.headerText}>Closed Date</Text></View>
            <View style={[styles.cell, styles.colPrice]}><Text style={styles.headerText}>Closed</Text></View>
            <View style={[styles.cell, styles.colPrice]}><Text style={styles.headerText}>TP</Text></View>
            <View style={[styles.cell, styles.colPrice]}><Text style={styles.headerText}>SL</Text></View>
            <View style={[styles.cell, styles.colLots]}><Text style={styles.headerText}>Lots</Text></View>
            <View style={[styles.cell, styles.colCommission]}><Text style={styles.headerText}>Commission</Text></View>
            <View style={[styles.cell, styles.colProfit]}><Text style={[styles.headerText, { textAlign: 'right' }]}>Profit</Text></View>
          </View>

          {/* ── Table Rows ── */}
          {trades.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>No trade history found for this selection.</Text>
            </View>
          ) : (
            trades.map((trade, idx) => {
              const isBuy = trade.direction === 'BUY';
              const profit = trade.profit ?? 0;
              const isProfit = profit >= 0;
              const isAlt = idx % 2 === 1;

              return (
                <TouchableOpacity
                  key={trade.id || `trade-${idx}`}
                  activeOpacity={0.7}
                  onPress={() => onSelectTrade?.(trade)}
                  style={[styles.row, isAlt && styles.rowAlt]}
                >
                  {/* Share button */}
                  <View style={[styles.cell, styles.colShare]}>
                    <TouchableOpacity
                      onPress={() => handleShare(trade)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.shareBtn}
                    >
                      <Share2 size={15} color={C.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  {/* Symbol */}
                  <View style={[styles.cell, styles.colSymbol]}>
                    <Text style={styles.symbolText} numberOfLines={1}>
                      {trade.symbol}
                    </Text>
                  </View>

                  {/* Type */}
                  <View style={[styles.cell, styles.colType]}>
                    <Text style={[styles.typeText, { color: isBuy ? C.green : C.red }]}>
                      {isBuy ? 'Buy' : 'Sell'}
                    </Text>
                  </View>

                  {/* Open Date */}
                  <View style={[styles.cell, styles.colDate]}>
                    <Text style={styles.dateText}>{formatDate(trade.opened_at)}</Text>
                  </View>

                  {/* Open Price */}
                  <View style={[styles.cell, styles.colPrice]}>
                    <Text style={styles.priceText}>{formatPrice(trade.entry_price)}</Text>
                  </View>

                  {/* Closed Date */}
                  <View style={[styles.cell, styles.colDate]}>
                    <Text style={styles.dateText}>{formatDate(trade.closed_at)}</Text>
                  </View>

                  {/* Closed Price */}
                  <View style={[styles.cell, styles.colPrice]}>
                    <Text style={styles.priceText}>
                      {formatPrice(trade.exit_price ?? trade.current_price)}
                    </Text>
                  </View>

                  {/* TP */}
                  <View style={[styles.cell, styles.colPrice]}>
                    <Text style={styles.priceText}>{formatPrice(trade.take_profit)}</Text>
                  </View>

                  {/* SL */}
                  <View style={[styles.cell, styles.colPrice]}>
                    <Text style={styles.priceText}>{formatPrice(trade.stop_loss)}</Text>
                  </View>

                  {/* Lots */}
                  <View style={[styles.cell, styles.colLots]}>
                    <Text style={styles.lotsText}>
                      {formatLots(trade.volume)}
                    </Text>
                  </View>

                  {/* Commission */}
                  <View style={[styles.cell, styles.colCommission]}>
                    <Text style={styles.commissionText}>{formatCommission(trade.commission)}</Text>
                  </View>

                  {/* Profit */}
                  <View style={[styles.cell, styles.colProfit]}>
                    <Text
                      style={[
                        styles.profitText,
                        { color: isProfit ? C.green : C.red },
                      ]}
                    >
                      {isProfit ? '+' : '-'}${Math.abs(profit).toFixed(2)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    marginTop: 16,
    marginBottom: 24,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  titleText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.white,
    letterSpacing: 0.2,
  },
  subtitleText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textSecondary,
  },
  tableScroll: {
    width: '100%',
  },
  table: {
    minWidth: 920,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: C.headerBg,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingVertical: 11,
    paddingHorizontal: 8,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textSecondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(42, 42, 58, 0.45)',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  rowAlt: {
    backgroundColor: C.rowAltBg,
  },
  cell: {
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  // Column width definitions
  colShare: {
    width: 44,
    alignItems: 'center',
  },
  colSymbol: {
    width: 82,
  },
  colType: {
    width: 58,
  },
  colDate: {
    width: 132,
  },
  colPrice: {
    width: 86,
  },
  colLots: {
    width: 54,
  },
  colCommission: {
    width: 90,
  },
  colProfit: {
    width: 96,
    alignItems: 'flex-end',
  },

  shareBtn: {
    padding: 4,
  },
  symbolText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.white,
  },
  typeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 12,
    color: '#D8D8E8',
    fontWeight: '500',
  },
  priceText: {
    fontSize: 12,
    color: '#E0E0F0',
    fontWeight: '500',
  },
  lotsText: {
    fontSize: 12,
    color: C.white,
    fontWeight: '600',
  },
  commissionText: {
    fontSize: 12,
    color: C.textSecondary,
    fontWeight: '500',
  },
  profitText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  emptyRow: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: C.textMuted,
  },
});
