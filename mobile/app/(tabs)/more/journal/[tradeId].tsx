import { View, Text, ScrollView, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Header } from '../../../../components/ui/Header';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { LoadingSkeleton } from '../../../../components/common/LoadingSkeleton';
import { journalService } from '../../../../services/api';
import { useTrade } from '../../../../hooks/useTrades';

const RATINGS = [1, 2, 3, 4, 5];

export default function JournalEntryScreen() {
  const { tradeId } = useLocalSearchParams<{ tradeId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: trade } = useTrade(tradeId);
  const { data: entry, isLoading } = useQuery({
    queryKey: ['journal', tradeId],
    queryFn: async () => {
      try {
        return await journalService.getEntry(tradeId);
      } catch (e) {
        return null; // no entry yet — that's a normal, expected state here
      }
    },
  });

  const [notes, setNotes] = useState('');
  const [lessons, setLessons] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (entry) {
      setNotes(entry.notes || '');
      setLessons(entry.lessons || '');
      setRating(entry.rating ?? null);
    }
  }, [entry]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { notes, lessons, rating: rating ?? undefined };
      if (entry) {
        await journalService.updateEntry(tradeId, payload);
      } else {
        await journalService.createEntry(tradeId, payload);
      }
      await queryClient.invalidateQueries({ queryKey: ['journal', tradeId] });
      await queryClient.invalidateQueries({ queryKey: ['trades'] });
      router.back();
    } catch (e) {
      Alert.alert('Error', 'Could not save journal entry. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Header
        title={trade ? `${trade.symbol} · ${trade.direction}` : 'Journal Entry'}
        subtitle={trade ? `${(trade.profit || 0) >= 0 ? '+' : ''}$${trade.profit?.toFixed(2) ?? '0.00'} · ${trade.r_multiple?.toFixed(2) ?? '0.00'}R` : undefined}
      />
      <ScrollView className="flex-1 px-4">
        {isLoading ? (
          <View className="mt-4"><LoadingSkeleton height={200} /></View>
        ) : (
          <Card className="mt-4 mb-6">
            <Text className="text-textSecondary text-xs mb-2">Rating</Text>
            <View className="flex-row mb-4">
              {RATINGS.map((r) => (
                <Text
                  key={r}
                  onPress={() => setRating(r === rating ? null : r)}
                  className={`text-2xl mr-2 ${rating && r <= rating ? 'opacity-100' : 'opacity-30'}`}
                >
                  ⭐
                </Text>
              ))}
            </View>

            <Text className="text-textSecondary text-xs mb-2">Notes</Text>
            <TextInput
              className="bg-surface2 text-white px-4 py-3 rounded-xl border border-border mb-4 min-h-[100px]"
              placeholder="What happened with this trade?"
              placeholderTextColor="#8888A8"
              multiline
              textAlignVertical="top"
              value={notes}
              onChangeText={setNotes}
            />

            <Text className="text-textSecondary text-xs mb-2">Lessons learned</Text>
            <TextInput
              className="bg-surface2 text-white px-4 py-3 rounded-xl border border-border mb-4 min-h-[80px]"
              placeholder="What would you do differently next time?"
              placeholderTextColor="#8888A8"
              multiline
              textAlignVertical="top"
              value={lessons}
              onChangeText={setLessons}
            />

            <Button title={entry ? 'Update Entry' : 'Save Entry'} onPress={handleSave} loading={saving} />
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
