import React from 'react';
import { View, Text } from 'react-native';

type StatusType = 
  | 'DETECTED' | 'PENDING' | 'ACTIVE' | 'TP_HIT' | 'SL_HIT' 
  | 'CLOSED' | 'EXPIRED' | 'CANCELLED' | 'INVALIDATED'
  | 'OPEN' | 'ONLINE' | 'OFFLINE';

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  let bgColor = "bg-surface2";
  let textColor = "text-textSecondary";
  let showDot = false;
  let dotColor = "";

  switch (status) {
    case 'PENDING':
      bgColor = "bg-[#FFB80020]"; textColor = "text-amber";
      break;
    case 'ACTIVE':
    case 'OPEN':
      bgColor = "bg-[#00D4FF20]"; textColor = "text-cyan"; showDot = true; dotColor = "bg-cyan";
      break;
    case 'TP_HIT':
      bgColor = "bg-[#00C89620]"; textColor = "text-green";
      break;
    case 'SL_HIT':
      bgColor = "bg-[#FF475720]"; textColor = "text-red";
      break;
    case 'EXPIRED':
    case 'CANCELLED':
    case 'INVALIDATED':
      bgColor = "bg-surface2"; textColor = "text-textMuted";
      break;
    case 'ONLINE':
      bgColor = "bg-surface2"; textColor = "text-green"; showDot = true; dotColor = "bg-green";
      break;
    case 'OFFLINE':
      bgColor = "bg-surface2"; textColor = "text-red"; showDot = true; dotColor = "bg-red";
      break;
    default:
      bgColor = "bg-surface2"; textColor = "text-textSecondary";
  }

  return (
    <View className={`flex-row items-center self-start px-2 py-1 rounded-md ${bgColor} ${className}`}>
      {showDot && <View className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dotColor}`} />}
      <Text className={`text-xs font-interSemiBold ${textColor}`}>{status}</Text>
    </View>
  );
}
