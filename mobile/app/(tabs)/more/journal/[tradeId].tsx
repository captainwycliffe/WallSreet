import { View, Text, ScrollView, TextInput, Alert, StyleSheet, TouchableOpacity } from 'react-native';
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

const C = {
  bg: '#0A0A0F',
  surface: '#12121A',
  surface2: '#1C1C28',
  border: '#2A2A3A',
  green: '#00C896',
  white: '#FFFFFF',
  textSecondary: '#8888A8',
};

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
        return null;
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
    <SafeAreaView style={styles.container}>
      <Header
        title={trade ? `${trade.symbol} · ${trade.direction}` : 'Journal Entry'}
        subtitle={trade ? `${(trade.profit || 0) >= 0 ? '+' : ''}$${trade.profit?.toFixed(2) ?? '0.00'} · ${trade.r_multiple?.toFixed(2) ?? '0.00'}R` : undefined}
      />
      <ScrollView style={styles.scroll}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <LoadingSkeleton height={200} />
          </View>
        ) : (
          <Card style={styles.card}>
            <Text style={styles.label}>Rating</Text>
            <View style={styles.ratingRow}>
              {RATINGS.map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setRating(r === rating ? null : r)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.star, rating && r <= rating ? styles.starActive : styles.starInactive]}>
                    ⭐
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder="What happened with this trade?"
              placeholderTextColor="#8888A8"
              multiline
              textAlignVertical="top"
              value={notes}
              onChangeText={setNotes}
            />

            <Text style={styles.label}>Lessons learned</Text>
            <TextInput
              style={[styles.input, styles.lessonsInput]}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    marginTop: 16,
  },
  card: {
    marginTop: 16,
    marginBottom: 24,
    padding: 16,
  },
  label: {
    color: C.textSecondary,
    fontSize: 12,
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  star: {
    fontSize: 24,
    marginRight: 8,
  },
  starActive: {
    opacity: 1,
  },
  starInactive: {
    opacity: 0.3,
  },
  input: {
    backgroundColor: C.surface2,
    color: C.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
  },
  notesInput: {
    minHeight: 100,
  },
  lessonsInput: {
    minHeight: 80,
  },
});
