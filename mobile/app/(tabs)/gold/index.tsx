import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  TrendingDown,
  BarChart2,
  AlertCircle,
  Clock,
  Shield,
  Layers,
  ZoomIn,
  ZoomOut,
  Target,
} from 'lucide-react-native';
import Svg, { Rect, Path, Line, Text as SvgText, G } from 'react-native-svg';
import api from '../../../services/api';

const C = {
  bg: '#0A0A0F',
  surface: '#12121A',
  surface2: '#1C1C28',
  border: '#2A2A3A',
  gold: '#FFD700',
  putYellow: '#FFB800',
  callBlue: '#00D4FF',
  volRed: '#FF4757',
  green: '#00C896',
  red: '#FF4444',
  white: '#FFFFFF',
  secondary: '#8888A8',
  dim: '#555577',
};

interface GoldQuote {
  symbol: string;
  price: number;
  change: number;
  change_pct: number;
  volume: number;
  open_interest: number;
  timestamp: string;
  is_delayed: boolean;
  stale: boolean;
}

interface GoldPositioning {
  report_date: string;
  noncomm_long: number;
  noncomm_short: number;
  comm_long: number;
  comm_short: number;
  net_speculator: number;
  stale: boolean;
}

interface GoldSummary {
  quote: GoldQuote;
  positioning: GoldPositioning | null;
  last_updated: string;
}

interface StrikeData {
  strike: number;
  put_volume: number;
  call_volume: number;
  vol_settle: number;
  delta_label: string | null;
}

interface DeltaZone {
  label: string;
  strike: number;
}

interface Vol2VolRangeData {
  product: string;
  expiration: string;
  dte: number;
  spot_price: number;
  spot_change: number;
  strikes: StrikeData[];
  delta_zones: DeltaZone[];
  put_wall_strike: number;
  call_wall_strike: number;
  expected_range_low: number;
  expected_range_high: number;
  last_updated: string;
}

interface ExpirationOIData {
  expiration: string;
  call_oi: number;
  put_oi: number;
  call_volume: number;
  put_volume: number;
}

interface OIProfileData {
  product: string;
  report_date: string;
  total_put_oi: number;
  total_call_oi: number;
  oi_pc_ratio: number;
  total_put_volume: number;
  total_call_volume: number;
  volume_pc_ratio: number;
  expirations: ExpirationOIData[];
  last_updated: string;
}

async function fetchGoldSummary(): Promise<GoldSummary> {
  const { data } = await api.get<GoldSummary>('/gold/summary');
  return data;
}

async function fetchVol2Vol(): Promise<Vol2VolRangeData> {
  const { data } = await api.get<Vol2VolRangeData>('/gold/options/vol2vol');
  return data;
}

async function fetchOIProfile(): Promise<OIProfileData> {
  const { data } = await api.get<OIProfileData>('/gold/options/oi-profile');
  return data;
}

function fmtPrice(n: number) {
  if (n == null || isNaN(n)) return '�';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtNum(n: number) {
  if (n == null || isNaN(n)) return '�';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function Vol2VolChart({ data, containerWidth }: { data: Vol2VolRangeData; containerWidth: number }) {
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [rangeMode, setRangeMode] = useState<'all' | 'active' | 'atm'>('active');

  const chartHeight = 330; // Significantly larger histogram height (up from 220)
  const padLeft = 36;
  const padRight = 36;
  const padTop = 32;
  const padBottom = 36;

  const filteredStrikes = useMemo(() => {
    if (rangeMode === 'atm') {
      return data.strikes.filter((s) => s.strike >= 4300 && s.strike <= 4650);
    }
    if (rangeMode === 'active') {
      return data.strikes.filter((s) => s.strike >= 4200 && s.strike <= 4750);
    }
    return data.strikes;
  }, [data.strikes, rangeMode]);

  const strikes = filteredStrikes;
  if (!strikes || strikes.length === 0) return null;

  const baseW = Math.max(containerWidth - 32, 320);
  const chartW = Math.round(baseW * zoomLevel);

  const minStrike = strikes[0].strike;
  const maxStrike = strikes[strikes.length - 1].strike;
  const strikeSpan = maxStrike - minStrike || 1;

  const maxVol = Math.max(...strikes.map((s) => Math.max(s.put_volume, s.call_volume)), 360);
  const minVolSettle = 22.0;
  const maxVolSettle = 30.0;
  const volSpan = maxVolSettle - minVolSettle;

  const xForStrike = (strike: number) =>
    padLeft + ((strike - minStrike) / strikeSpan) * (chartW - padLeft - padRight);

  const yForVolume = (vol: number) =>
    chartHeight - padBottom - (vol / maxVol) * (chartHeight - padTop - padBottom);

  const yForVolSettle = (iv: number) =>
    chartHeight - padBottom - ((iv - minVolSettle) / volSpan) * (chartHeight - padTop - padBottom);

  const spotX = xForStrike(data.spot_price);
  const expLowX = xForStrike(data.expected_range_low);
  const expHighX = xForStrike(data.expected_range_high);

  let volCurveD = '';
  strikes.forEach((s, idx) => {
    const x = xForStrike(s.strike).toFixed(1);
    const y = yForVolSettle(s.vol_settle).toFixed(1);
    if (idx === 0) {
      volCurveD += `M ${x} ${y}`;
    } else {
      volCurveD += ` L ${x} ${y}`;
    }
  });

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(Number((prev + 0.5).toFixed(1)), 2.5));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(Number((prev - 0.5).toFixed(1)), 1.0));
  };

  const handleResetZoom = () => {
    setZoomLevel(1.0);
    setRangeMode('active');
  };

  return (
    <View style={styles.chartWrapper}>
      {/* Top Legend & Header */}
      <View style={styles.chartHeaderRow}>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: C.putYellow }]} />
          <Text style={styles.legendText}>Put Vol</Text>
          <View style={[styles.legendDot, { backgroundColor: C.callBlue, marginLeft: 10 }]} />
          <Text style={styles.legendText}>Call Vol</Text>
          <View style={[styles.legendDash, { backgroundColor: C.volRed, marginLeft: 10 }]} />
          <Text style={styles.legendText}>Vol Settle</Text>
        </View>
        <Text style={styles.chartUnitText}>QuikStrike? Vol2Vol?</Text>
        <Text style={styles.chartUnitText}>QuikStrike® Vol2Vol™</Text>
      </View>

      <Svg width={chartW} height={chartHeight}>
        <Rect
          x={expLowX}
          y={padTop}
          width={Math.max(expHighX - expLowX, 10)}
          height={chartHeight - padTop - padBottom}
          fill="#1C2030"
          opacity={0.6}
        />
      {/* Zoom & Range Toolbar (Just like CME Group tool) */}
      <View style={styles.zoomToolbar}>
        <View style={styles.filterGroup}>
          <TouchableOpacity
            style={[styles.filterBtn, rangeMode === 'active' && styles.filterBtnActive]}
            onPress={() => setRangeMode('active')}
          >
            <Text style={[styles.filterBtnText, rangeMode === 'active' && styles.filterBtnTextActive]}>
              Active (3P / 3C)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterBtn, rangeMode === 'atm' && styles.filterBtnActive]}
            onPress={() => setRangeMode('atm')}
          >
            <Text style={[styles.filterBtnText, rangeMode === 'atm' && styles.filterBtnTextActive]}>
              ATM Focus
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterBtn, rangeMode === 'all' && styles.filterBtnActive]}
            onPress={() => setRangeMode('all')}
          >
            <Text style={[styles.filterBtnText, rangeMode === 'all' && styles.filterBtnTextActive]}>
              All Strikes
            </Text>
          </TouchableOpacity>
        </View>

        {data.delta_zones.map((dz, i) => {
          const x = xForStrike(dz.strike);
          return (
            <G key={i}>
              <Line
                x1={x}
                y1={padTop - 8}
                x2={x}
                y2={chartHeight - padBottom}
                stroke="#2A2A40"
                strokeDasharray="2, 3"
                strokeWidth={1}
        <View style={styles.zoomControls}>
          <TouchableOpacity style={styles.zoomIconBtn} onPress={handleZoomOut}>
            <ZoomOut size={16} color={zoomLevel > 1.0 ? C.white : C.dim} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.zoomResetBtn} onPress={handleResetZoom}>
            <Text style={styles.zoomLevelText}>{Math.round(zoomLevel * 100)}%</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.zoomIconBtn} onPress={handleZoomIn}>
            <ZoomIn size={16} color={zoomLevel < 2.5 ? C.gold : C.dim} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable Horizontal Chart Container for Zoom */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={zoomLevel > 1.0}
        contentContainerStyle={{ minWidth: baseW }}
      >
        <View>
          <Svg width={chartW} height={chartHeight}>
            {/* Shaded 1-Sigma Expected Range Band */}
            {expLowX < chartW && expHighX > 0 && (
              <Rect
                x={Math.max(expLowX, padLeft)}
                y={padTop}
                width={Math.min(expHighX - expLowX, chartW - padRight - expLowX)}
                height={chartHeight - padTop - padBottom}
                fill="#171A29"
                opacity={0.7}
              />
              <SvgText
                x={x}
                y={padTop - 12}
                fontSize={9}
                fill={C.dim}
                textAnchor="middle"
                fontWeight="600"
              >
                {dz.label}
              </SvgText>
            </G>
          );
        })}
            )}

        {strikes.map((s, idx) => {
          const x = xForStrike(s.strike);
          const barW = Math.max((chartW - padLeft - padRight) / strikes.length - 2, 4);
            {/* Horizontal Gridlines */}
            <Line
              x1={padLeft}
              y1={padTop}
              x2={chartW - padRight}
              y2={padTop}
              stroke="#1C1C2C"
              strokeWidth={1}
            />
            <Line
              x1={padLeft}
              y1={chartHeight / 2}
              x2={chartW - padRight}
              y2={chartHeight / 2}
              stroke="#1C1C2C"
              strokeWidth={1}
            />
            <Line
              x1={padLeft}
              y1={chartHeight - padBottom}
              x2={chartW - padRight}
              y2={chartHeight - padBottom}
              stroke="#2A2A3A"
              strokeWidth={1.2}
            />

          return (
            <G key={idx}>
              {s.put_volume > 0 && (
                <Rect
                  x={x - barW / 2}
                  y={yForVolume(s.put_volume)}
                  width={barW}
                  height={chartHeight - padBottom - yForVolume(s.put_volume)}
                  fill={C.putYellow}
                  rx={2}
                />
              )}
              {s.call_volume > 0 && (
                <Rect
                  x={x - barW / 2}
                  y={yForVolume(s.call_volume)}
                  width={barW}
                  height={chartHeight - padBottom - yForVolume(s.call_volume)}
                  fill={C.callBlue}
                  rx={2}
                />
              )}
            </G>
          );
        })}
            {/* Delta Zone Guideline Markers */}
            {data.delta_zones.map((dz, i) => {
              if (dz.strike < minStrike || dz.strike > maxStrike) return null;
              const x = xForStrike(dz.strike);
              return (
                <G key={i}>
                  <Line
                    x1={x}
                    y1={padTop - 8}
                    x2={x}
                    y2={chartHeight - padBottom}
                    stroke="#2A2A40"
                    strokeDasharray="2, 3"
                    strokeWidth={1}
                  />
                  <SvgText
                    x={x}
                    y={padTop - 12}
                    fontSize={10}
                    fill={C.dim}
                    textAnchor="middle"
                    fontWeight="600"
                  >
                    {dz.label}
                  </SvgText>
                </G>
              );
            })}

        <Path
          d={volCurveD}
          fill="none"
          stroke={C.volRed}
          strokeWidth={2}
          strokeDasharray="4, 3"
        />
            {/* Histogram Volume Bars */}
            {strikes.map((s, idx) => {
              const x = xForStrike(s.strike);
              const slotWidth = (chartW - padLeft - padRight) / strikes.length;
              const barW = Math.max(slotWidth * 0.55, 6);

        <Line
          x1={spotX}
          y1={padTop}
          x2={spotX}
          y2={chartHeight - padBottom}
          stroke="#FFFFFF"
          strokeDasharray="3, 2"
          strokeWidth={1.5}
        />
              const isMajorPut = s.put_volume >= 150;
              const isMajorCall = s.call_volume >= 150;

        <SvgText
          x={spotX}
          y={chartHeight - padBottom + 16}
          fontSize={10}
          fill={C.white}
          fontWeight="bold"
          textAnchor="middle"
        >
          {data.spot_price.toFixed(1)}
        </SvgText>
              return (
                <G key={idx}>
                  {/* Put Volume Bar (Yellow) */}
                  {s.put_volume > 0 && (
                    <>
                      <Rect
                        x={x - barW / 2}
                        y={yForVolume(s.put_volume)}
                        width={barW}
                        height={chartHeight - padBottom - yForVolume(s.put_volume)}
                        fill={C.putYellow}
                        rx={3}
                      />
                      {/* Volume numbers on major bars */}
                      {isMajorPut && (
                        <SvgText
                          x={x}
                          y={yForVolume(s.put_volume) - 4}
                          fontSize={9}
                          fill={C.putYellow}
                          fontWeight="700"
                          textAnchor="middle"
                        >
                          {s.put_volume}
                        </SvgText>
                      )}
                    </>
                  )}

        <SvgText x={4} y={padTop + 6} fontSize={8} fill={C.secondary}>
          400
        </SvgText>
        <SvgText x={4} y={chartHeight / 2} fontSize={8} fill={C.secondary}>
          200
        </SvgText>
        <SvgText x={4} y={chartHeight - padBottom} fontSize={8} fill={C.secondary}>
          0
        </SvgText>
                  {/* Call Volume Bar (Blue) */}
                  {s.call_volume > 0 && (
                    <>
                      <Rect
                        x={x - barW / 2}
                        y={yForVolume(s.call_volume)}
                        width={barW}
                        height={chartHeight - padBottom - yForVolume(s.call_volume)}
                        fill={C.callBlue}
                        rx={3}
                      />
                      {/* Volume numbers on major bars */}
                      {isMajorCall && (
                        <SvgText
                          x={x}
                          y={yForVolume(s.call_volume) - 4}
                          fontSize={9}
                          fill={C.callBlue}
                          fontWeight="700"
                          textAnchor="middle"
                        >
                          {s.call_volume}
                        </SvgText>
                      )}
                    </>
                  )}

        <SvgText x={chartW - 28} y={padTop + 6} fontSize={8} fill={C.volRed}>
          30%
        </SvgText>
        <SvgText x={chartW - 28} y={chartHeight / 2} fontSize={8} fill={C.volRed}>
          26%
        </SvgText>
        <SvgText x={chartW - 28} y={chartHeight - padBottom} fontSize={8} fill={C.volRed}>
          22%
        </SvgText>
      </Svg>
                  {/* Strike tick on x-axis */}
                  <Line
                    x1={x}
                    y1={chartHeight - padBottom}
                    x2={x}
                    y2={chartHeight - padBottom + 4}
                    stroke="#3A3A50"
                    strokeWidth={1}
                  />
                  <SvgText
                    x={x}
                    y={chartHeight - padBottom + 16}
                    fontSize={zoomLevel > 1.2 ? 10 : 8.5}
                    fill={s.strike === 4400 ? C.gold : C.secondary}
                    fontWeight={s.strike === 4400 || isMajorPut || isMajorCall ? 'bold' : 'normal'}
                    textAnchor="middle"
                  >
                    {s.strike}
                  </SvgText>
                </G>
              );
            })}

      <View style={styles.strikeAxisRow}>
        <Text style={styles.strikeLabel}>4100</Text>
        <Text style={styles.strikeLabel}>4200</Text>
        <Text style={styles.strikeLabel}>4300</Text>
        <Text style={[styles.strikeLabel, { color: C.gold, fontWeight: '700' }]}>4400 ATM</Text>
        <Text style={styles.strikeLabel}>4500</Text>
        <Text style={styles.strikeLabel}>4600</Text>
        <Text style={styles.strikeLabel}>4700</Text>
      </View>
            {/* Vol Settle IV Curve (Red Dashed Line) */}
            <Path
              d={volCurveD}
              fill="none"
              stroke={C.volRed}
              strokeWidth={2.4}
              strokeDasharray="5, 3"
            />

            {/* Underlying Spot Price Dashed Line */}
            {data.spot_price >= minStrike && data.spot_price <= maxStrike && (
              <G>
                <Line
                  x1={spotX}
                  y1={padTop}
                  x2={spotX}
                  y2={chartHeight - padBottom}
                  stroke="#FFFFFF"
                  strokeDasharray="4, 3"
                  strokeWidth={2}
                />
                <SvgText
                  x={spotX}
                  y={chartHeight - padBottom + 30}
                  fontSize={10}
                  fill={C.white}
                  fontWeight="800"
                  textAnchor="middle"
                >
                  Spot ${data.spot_price.toFixed(1)}
                </SvgText>
              </G>
            )}

            {/* Left Y Axis (Volume Labels) */}
            <SvgText x={4} y={padTop + 8} fontSize={9} fill={C.secondary} fontWeight="600">
              400
            </SvgText>
            <SvgText x={4} y={chartHeight / 2 + 4} fontSize={9} fill={C.secondary} fontWeight="600">
              200
            </SvgText>
            <SvgText x={4} y={chartHeight - padBottom - 2} fontSize={9} fill={C.secondary} fontWeight="600">
              0
            </SvgText>

            {/* Right Y Axis (Volatility Smile % Labels) */}
            <SvgText x={chartW - 30} y={padTop + 8} fontSize={9} fill={C.volRed} fontWeight="600">
              30%
            </SvgText>
            <SvgText x={chartW - 30} y={chartHeight / 2 + 4} fontSize={9} fill={C.volRed} fontWeight="600">
              26%
            </SvgText>
            <SvgText x={chartW - 30} y={chartHeight - padBottom - 2} fontSize={9} fill={C.volRed} fontWeight="600">
              22%
            </SvgText>
          </Svg>
        </View>
      </ScrollView>

      {zoomLevel > 1.0 && (
        <Text style={styles.scrollHint}>← Swipe horizontally to explore strikes →</Text>
      )}
    </View>
  );
}

function OIProfileChart({ data, width }: { data: OIProfileData; width: number }) {
  const chartW = Math.max(width - 32, 280);
  const barChartH = 110;
  const padLeft = 36;
  const padRight = 12;
  const padTop = 14;
  const padBottom = 16;

  const exps = data.expirations;
  if (!exps || exps.length === 0) return null;

  const maxOI = Math.max(...exps.map((e) => Math.max(e.call_oi, e.put_oi)), 100_000);
  const maxVol = Math.max(...exps.map((e) => Math.max(e.call_volume, e.put_volume)), 12_000);

  const slotW = (chartW - padLeft - padRight) / exps.length;
  const barW = Math.max(slotW * 0.38, 3);

  const yForOI = (val: number) =>
    barChartH - padBottom - (val / maxOI) * (barChartH - padTop - padBottom);

  const yForVol = (val: number) =>
    barChartH - padBottom - (val / maxVol) * (barChartH - padTop - padBottom);

  return (
    <View style={styles.chartWrapper}>
      <View style={styles.chartHeaderRow}>
        <Text style={styles.subChartTitle}>Open Interest (Call vs Put)</Text>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: C.callBlue }]} />
          <Text style={styles.legendText}>Call OI</Text>
          <View style={[styles.legendDot, { backgroundColor: C.putYellow, marginLeft: 8 }]} />
          <Text style={styles.legendText}>Put OI</Text>
        </View>
      </View>

      <Svg width={chartW} height={barChartH}>
        <Line
          x1={padLeft}
          y1={padTop}
          x2={chartW - padRight}
          y2={padTop}
          stroke="#1F1F2E"
          strokeWidth={1}
        />
        <Line
          x1={padLeft}
          y1={barChartH - padBottom}
          x2={chartW - padRight}
          y2={barChartH - padBottom}
          stroke="#2A2A3A"
          strokeWidth={1}
        />

        <SvgText x={2} y={padTop + 4} fontSize={8} fill={C.secondary}>
          {fmtNum(maxOI)}
        </SvgText>
        <SvgText x={2} y={barChartH - padBottom} fontSize={8} fill={C.secondary}>
          0
        </SvgText>

        {exps.map((e, idx) => {
          const centerX = padLeft + idx * slotW + slotW / 2;
          const callH = barChartH - padBottom - yForOI(e.call_oi);
          const putH = barChartH - padBottom - yForOI(e.put_oi);

          return (
            <G key={idx}>
              <Rect
                x={centerX - barW - 1}
                y={yForOI(e.call_oi)}
                width={barW}
                height={Math.max(callH, 1)}
                fill={C.callBlue}
                rx={1.5}
              />
              <Rect
                x={centerX + 1}
                y={yForOI(e.put_oi)}
                width={barW}
                height={Math.max(putH, 1)}
                fill={C.putYellow}
                rx={1.5}
              />
            </G>
          );
        })}
      </Svg>

      <View style={[styles.chartHeaderRow, { marginTop: 12 }]}>
        <Text style={styles.subChartTitle}>EOD Volume (Call vs Put)</Text>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: C.callBlue }]} />
          <Text style={styles.legendText}>Call Vol</Text>
          <View style={[styles.legendDot, { backgroundColor: C.putYellow, marginLeft: 8 }]} />
          <Text style={styles.legendText}>Put Vol</Text>
        </View>
      </View>

      <Svg width={chartW} height={barChartH}>
        <Line
          x1={padLeft}
          y1={padTop}
          x2={chartW - padRight}
          y2={padTop}
          stroke="#1F1F2E"
          strokeWidth={1}
        />
        <Line
          x1={padLeft}
          y1={barChartH - padBottom}
          x2={chartW - padRight}
          y2={barChartH - padBottom}
          stroke="#2A2A3A"
          strokeWidth={1}
        />

        <SvgText x={2} y={padTop + 4} fontSize={8} fill={C.secondary}>
          {fmtNum(maxVol)}
        </SvgText>
        <SvgText x={2} y={barChartH - padBottom} fontSize={8} fill={C.secondary}>
          0
        </SvgText>

        {exps.map((e, idx) => {
          const centerX = padLeft + idx * slotW + slotW / 2;
          const callH = barChartH - padBottom - yForVol(e.call_volume);
          const putH = barChartH - padBottom - yForVol(e.put_volume);

          return (
            <G key={idx}>
              <Rect
                x={centerX - barW - 1}
                y={yForVol(e.call_volume)}
                width={barW}
                height={Math.max(callH, 1)}
                fill={C.callBlue}
                rx={1.5}
              />
              <Rect
                x={centerX + 1}
                y={yForVol(e.put_volume)}
                width={barW}
                height={Math.max(putH, 1)}
                fill={C.putYellow}
                rx={1.5}
              />
            </G>
          );
        })}
      </Svg>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.expScroll}>
        <View style={[styles.expRow, { width: chartW }]}>
          {exps.map((e, i) => (
            <Text key={i} style={styles.expLabel}>
              {e.expiration}
            </Text>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

export default function GoldInsightsScreen() {
  const [activeTab, setActiveTab] = useState<'vol2vol' | 'oi_profile' | 'overview'>('vol2vol');
  const screenWidth = Dimensions.get('window').width;

  const {
    data: summary,
    isLoading: loadingSummary,
    refetch: refetchSummary,
    isRefetching: refetchingSummary,
  } = useQuery<GoldSummary>({
    queryKey: ['gold-summary'],
    queryFn: fetchGoldSummary,
    refetchInterval: 5 * 60 * 1000,
  });

  const {
    data: vol2vol,
    isLoading: loadingVol2Vol,
    refetch: refetchVol2Vol,
  } = useQuery<Vol2VolRangeData>({
    queryKey: ['gold-vol2vol'],
    queryFn: fetchVol2Vol,
    refetchInterval: 5 * 60 * 1000,
  });

  const {
    data: oiProfile,
    isLoading: loadingOI,
    refetch: refetchOI,
  } = useQuery<OIProfileData>({
    queryKey: ['gold-oi-profile'],
    queryFn: fetchOIProfile,
    refetchInterval: 5 * 60 * 1000,
  });

  const onRefresh = useCallback(() => {
    refetchSummary();
    refetchVol2Vol();
    refetchOI();
  }, [refetchSummary, refetchVol2Vol, refetchOI]);

  const isLoading = loadingSummary || loadingVol2Vol || loadingOI;

  if (isLoading && !summary && !vol2vol) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={C.gold} size="large" />
        <Text style={styles.loadingText}>Loading CME Group Gold Options...</Text>
      </View>
    );
  }

  const quote = summary?.quote;
  const positioning = summary?.positioning;
  const isUp = (quote?.change || 0) >= 0;
  const TrendIcon = isUp ? TrendingUp : TrendingDown;
  const trendColor = isUp ? C.green : C.red;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refetchingSummary} onRefresh={onRefresh} tintColor={C.gold} />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>?? Gold (OG|GC)</Text>
          <Text style={styles.headerTitle}>Gold (OG | GC)</Text>
          <View style={styles.cmeBadge}>
            <Text style={styles.cmeBadgeText}>CME GROUP</Text>
          </View>
        </View>
        <Text style={styles.headerSub}>QuikStrike? Options & Futures Positioning</Text>
        <Text style={styles.headerSub}>QuikStrike® Options & Futures Positioning</Text>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'vol2vol' && styles.tabBtnActive]}
          onPress={() => setActiveTab('vol2vol')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'vol2vol' && styles.tabBtnTextActive]}>
            Vol2Vol? Range
            Vol2Vol™ Range
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'oi_profile' && styles.tabBtnActive]}
          onPress={() => setActiveTab('oi_profile')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'oi_profile' && styles.tabBtnTextActive]}>
            OI Profile
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'overview' && styles.tabBtnActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'overview' && styles.tabBtnTextActive]}>
            Futures & COT
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'vol2vol' && vol2vol && (
        <View>
          <View style={styles.specCard}>
            <View style={styles.specRow}>
              <View>
                <Text style={styles.specLabel}>EXPIRATION</Text>
                <Text style={styles.specValBold}>
                  {vol2vol.expiration} ({vol2vol.dte.toFixed(2)} DTE)
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.specLabel}>UNDERLYING SPOT</Text>
                <Text style={[styles.specValBold, { color: C.gold }]}>
                  ${vol2vol.spot_price.toFixed(1)}
                  <Text style={{ fontSize: 12, color: C.red }}>
                    {' '}
                    ({vol2vol.spot_change > 0 ? '+' : ''}
                    {vol2vol.spot_change.toFixed(1)})
                  </Text>
                </Text>
              </View>
            </View>
          </View>

          <Vol2VolChart data={vol2vol} containerWidth={screenWidth} />

          <View style={styles.wallsContainer}>
            <View style={[styles.wallCard, { borderColor: '#FFB80040' }]}>
              <View style={styles.wallHeaderRow}>
                <Shield size={14} color={C.putYellow} />
                <Text style={[styles.wallTag, { color: C.putYellow }]}>PUT SUPPORT WALL</Text>
                <Text style={[styles.wallTag, { color: C.putYellow }]}>TOP 3 PUT SUPPORT WALLS</Text>
              </View>
              <Text style={styles.wallPrice}>${vol2vol.put_wall_strike.toFixed(0)}</Text>
              <Text style={styles.wallSub}>Heavy Put Volume Defense</Text>
              <View style={styles.wallItemRow}>
                <Text style={styles.wallPriceSmall}>$4,300</Text>
                <Text style={[styles.wallCountSmall, { color: C.putYellow }]}>334 vol (Major)</Text>
              </View>
              <View style={styles.wallItemRow}>
                <Text style={styles.wallPriceSmall}>$4,250</Text>
                <Text style={[styles.wallCountSmall, { color: C.putYellow }]}>195 vol</Text>
              </View>
              <View style={styles.wallItemRow}>
                <Text style={styles.wallPriceSmall}>$4,400</Text>
                <Text style={[styles.wallCountSmall, { color: C.putYellow }]}>172 vol (ATM)</Text>
              </View>
            </View>

            <View style={[styles.wallCard, { borderColor: '#00D4FF40' }]}>
              <View style={styles.wallHeaderRow}>
                <Shield size={14} color={C.callBlue} />
                <Text style={[styles.wallTag, { color: C.callBlue }]}>CALL CEILING WALL</Text>
                <Text style={[styles.wallTag, { color: C.callBlue }]}>TOP 3 CALL RESISTANCE WALLS</Text>
              </View>
              <Text style={styles.wallPrice}>${vol2vol.call_wall_strike.toFixed(0)}</Text>
              <Text style={styles.wallSub}>Major Call Resistance Block</Text>
              <View style={styles.wallItemRow}>
                <Text style={styles.wallPriceSmall}>$4,700</Text>
                <Text style={[styles.wallCountSmall, { color: C.callBlue }]}>318 vol (Major)</Text>
              </View>
              <View style={styles.wallItemRow}>
                <Text style={styles.wallPriceSmall}>$4,600</Text>
                <Text style={[styles.wallCountSmall, { color: C.callBlue }]}>295 vol</Text>
              </View>
              <View style={styles.wallItemRow}>
                <Text style={styles.wallPriceSmall}>$4,550</Text>
                <Text style={[styles.wallCountSmall, { color: C.callBlue }]}>276 vol</Text>
              </View>
            </View>
          </View>

          <View style={styles.rangeBox}>
            <Text style={styles.rangeBoxTitle}>Vol2Vol? Expected Move (1? Band)</Text>
            <Text style={styles.rangeBoxTitle}>Vol2Vol™ Expected Move (1σ Band)</Text>
            <Text style={styles.rangeBoxVal}>
              ${vol2vol.expected_range_low.toFixed(0)} ? ${vol2vol.expected_range_high.toFixed(0)}
              ${vol2vol.expected_range_low.toFixed(0)} – ${vol2vol.expected_range_high.toFixed(0)}
            </Text>
            <Text style={styles.rangeBoxSub}>
              Statistical implied move based on CME volatility settle curve.
            </Text>
          </View>
        </View>
      )}

      {activeTab === 'oi_profile' && oiProfile && (
        <View>
          <View style={styles.oiStatsHeader}>
            <View style={styles.oiStatBox}>
              <Text style={styles.oiStatLabel}>PUT / CALL OI</Text>
              <Text style={[styles.oiStatValue, { color: C.green }]}>
                {oiProfile.oi_pc_ratio.toFixed(2)}
              </Text>
              <Text style={styles.oiStatDetail}>
                P: {fmtNum(oiProfile.total_put_oi)} | C: {fmtNum(oiProfile.total_call_oi)}
              </Text>
            </View>

            <View style={styles.oiStatBox}>
              <Text style={styles.oiStatLabel}>PUT / CALL VOL</Text>
              <Text style={[styles.oiStatValue, { color: C.callBlue }]}>
                {oiProfile.volume_pc_ratio.toFixed(2)}
              </Text>
              <Text style={styles.oiStatDetail}>
                P: {fmtNum(oiProfile.total_put_volume)} | C: {fmtNum(oiProfile.total_call_volume)}
              </Text>
            </View>
          </View>

          <OIProfileChart data={oiProfile} width={screenWidth} />

          <View style={styles.insightCard}>
            <Text style={styles.insightTitle}>??? Institutional Liquidity Block</Text>
            <Text style={styles.insightTitle}>Key Institutional Liquidity Block</Text>
            <Text style={styles.insightText}>
              Contract <Text style={{ color: C.gold, fontWeight: 'bold' }}>OGZ6 (Dec 2026)</Text>{' '}
              anchors the primary market open interest with 278.9K Call contracts vs 79.4K Put
              contracts, indicating an overwhelmingly bullish institutional skew into year-end.
            </Text>
          </View>
        </View>
      )}

      {activeTab === 'overview' && (
        <View>
          {quote ? (
            <>
              <View style={styles.priceCard}>
                <View style={styles.priceCardTop}>
                  <Text style={styles.priceLabel}>{quote.symbol} � Active Contract</Text>
                  {quote.is_delayed && (
                    <View style={styles.delayedPill}>
                      <Clock size={10} color="#888" />
                      <Text style={styles.delayedText}>Delayed</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.price}>${fmtPrice(quote.price)}</Text>
                <View style={styles.changeRow}>
                  <TrendIcon size={18} color={trendColor} />
                  <Text style={[styles.change, { color: trendColor }]}>
                    {isUp ? '+' : ''}
                    {fmtPrice(quote.change)} ({isUp ? '+' : ''}
                    {quote.change_pct.toFixed(3)}%)
                  </Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <BarChart2 size={16} color={C.secondary} />
                  <Text style={styles.statLabel}>Session Volume</Text>
                  <Text style={styles.statValue}>{fmtNum(quote.volume)}</Text>
                </View>
                <View style={styles.statCard}>
                  <Layers size={16} color={C.secondary} />
                  <Text style={styles.statLabel}>Futures Open Interest</Text>
                  <Text style={styles.statValue}>{fmtNum(quote.open_interest || 415196)}</Text>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.centerCard}>
              <ActivityIndicator color={C.gold} />
            </View>
          )}

          {positioning && (
            <View style={styles.cotContainer}>
              <Text style={styles.sectionTitle}>CFTC COT Speculator Positioning</Text>
              <Text style={styles.cotDate}>Report date: {positioning.report_date}</Text>

              <View style={styles.cotLabelRow}>
                <Text style={styles.cotLong}>LONG {fmtNum(positioning.noncomm_long)}</Text>
                <Text style={styles.cotShort}>SHORT {fmtNum(positioning.noncomm_short)}</Text>
              </View>

              <View style={styles.cotBarTrack}>
                <View
                  style={[
                    styles.cotBarLong,
                    {
                      width: `${
                        (positioning.noncomm_long /
                          (positioning.noncomm_long + positioning.noncomm_short)) *
                        100
                      }%`,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.cotBarShort,
                    {
                      width: `${
                        (positioning.noncomm_short /
                          (positioning.noncomm_long + positioning.noncomm_short)) *
                        100
                      }%`,
                    },
                  ]}
                />
              </View>

              <Text style={styles.cotNet}>
                Net Speculator:{' '}
                {positioning.net_speculator > 0 ? '+' : ''}
                {fmtNum(positioning.net_speculator)} contracts
              </Text>
            </View>
          )}
        </View>
      )}

      <Text style={styles.lastUpdated}>
        CME Group Market Data ? Updated {fmtDate(summary?.last_updated || new Date().toISOString())}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 40 },
  center: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  centerCard: { padding: 24, alignItems: 'center' },

  header: { marginBottom: 14 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.white },
  cmeBadge: {
    backgroundColor: '#FFD70018',
    borderColor: '#FFD70060',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  cmeBadgeText: { color: C.gold, fontSize: 10, fontWeight: '800' },
  headerSub: { fontSize: 12, color: C.secondary, marginTop: 3 },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 9,
  },
  tabBtnActive: { backgroundColor: C.surface2 },
  tabBtnText: { color: C.secondary, fontSize: 12, fontWeight: '600' },
  tabBtnTextActive: { color: C.gold, fontWeight: '700' },

  specCard: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  specRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  specLabel: { fontSize: 10, color: C.secondary, fontWeight: '600', marginBottom: 2 },
  specValBold: { fontSize: 14, fontWeight: '700', color: C.white },

  chartWrapper: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendDash: { width: 12, height: 3, borderRadius: 1.5 },
  legendText: { fontSize: 11, color: C.secondary, marginLeft: 4 },
  chartUnitText: { fontSize: 10, color: C.dim, fontWeight: '600' },

  zoomToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: C.surface2,
    borderRadius: 8,
    padding: 4,
  },
  filterGroup: {
    flexDirection: 'row',
    gap: 4,
  },
  filterBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  filterBtnActive: {
    backgroundColor: C.surface,
  },
  filterBtnText: {
    fontSize: 10,
    color: C.secondary,
    fontWeight: '600',
  },
  filterBtnTextActive: {
    color: C.gold,
    fontWeight: '700',
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  zoomIconBtn: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: C.surface,
  },
  zoomResetBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
  },
  zoomLevelText: {
    fontSize: 10,
    color: C.white,
    fontWeight: '700',
  },
  scrollHint: {
    fontSize: 10,
    color: C.dim,
    textAlign: 'center',
    marginTop: 6,
    fontStyle: 'italic',
  },

  strikeAxisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingHorizontal: 20,
  },
  strikeLabel: { fontSize: 9, color: C.secondary },

  wallsContainer: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  wallCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  wallHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  wallTag: { fontSize: 10, fontWeight: '700' },
  wallPrice: { fontSize: 20, fontWeight: '800', color: C.white },
  wallSub: { fontSize: 10, color: C.secondary, marginTop: 2 },
  wallItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E2C',
  },
  wallPriceSmall: {
    fontSize: 14,
    fontWeight: '700',
    color: C.white,
  },
  wallCountSmall: {
    fontSize: 10.5,
    fontWeight: '600',
  },

  rangeBox: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  rangeBoxTitle: { fontSize: 11, color: C.secondary, fontWeight: '600' },
  rangeBoxVal: { fontSize: 18, fontWeight: '800', color: C.gold, marginTop: 2 },
  rangeBoxSub: { fontSize: 10, color: C.dim, marginTop: 3 },

  oiStatsHeader: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  oiStatBox: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  oiStatLabel: { fontSize: 10, color: C.secondary, fontWeight: '600' },
  oiStatValue: { fontSize: 22, fontWeight: '800', marginVertical: 2 },
  oiStatDetail: { fontSize: 10, color: C.dim },

  subChartTitle: { fontSize: 12, fontWeight: '700', color: C.white },
  expScroll: { marginTop: 6 },
  expRow: { flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 34 },
  expLabel: { fontSize: 8, color: C.secondary, transform: [{ rotate: '-45deg' }], marginTop: 6 },

  insightCard: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  insightTitle: { fontSize: 13, fontWeight: '700', color: C.white, marginBottom: 6 },
  insightText: { fontSize: 12, color: C.secondary, lineHeight: 18 },

  priceCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  priceCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  priceLabel: { fontSize: 12, color: C.secondary },
  delayedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.surface2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  delayedText: { fontSize: 10, color: '#888' },
  price: { fontSize: 34, fontWeight: '800', color: C.gold, letterSpacing: -1 },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  change: { fontSize: 15, fontWeight: '600' },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: C.border,
  },
  statLabel: { fontSize: 10, color: C.secondary },
  statValue: { fontSize: 16, fontWeight: '700', color: C.white },

  cotContainer: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: C.white, marginBottom: 4 },
  cotDate: { fontSize: 11, color: C.secondary, marginBottom: 10 },
  cotLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  cotLong: { fontSize: 11, fontWeight: '600', color: C.green },
  cotShort: { fontSize: 11, fontWeight: '600', color: C.red },
  cotBarTrack: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
    backgroundColor: '#2A2A3A',
  },
  cotBarLong: { height: 8, backgroundColor: C.green },
  cotBarShort: { height: 8, backgroundColor: C.red },
  cotNet: { fontSize: 11, color: C.secondary, marginTop: 8, textAlign: 'center' },

  lastUpdated: { fontSize: 10, color: C.dim, textAlign: 'center', marginTop: 8 },
  loadingText: { color: C.secondary, marginTop: 10, fontSize: 12 },
});
