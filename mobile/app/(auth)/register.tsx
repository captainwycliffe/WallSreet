import { View, Text, TextInput, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter, Link } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();
  const router = useRouter();

  const handleRegister = async () => {
    if (!email || !username || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await register({ email, username, password });
      // authStore.register logs the new user in on success, and the root
      // layout's auth guard will redirect into (tabs) automatically.
    } catch (e: any) {
      const message = e?.response?.data?.detail || 'Could not create your account. Please try again.';
      Alert.alert('Registration failed', typeof message === 'string' ? message : 'Please check your details and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-background justify-center px-6">
      <View className="items-center mb-10">
        <Text className="text-white text-3xl font-interBold">Create Account</Text>
        <Text className="text-textSecondary mt-2">Set up your MT5 Monitor account</Text>
      </View>

      <View className="space-y-4">
        <TextInput
          className="bg-surface2 text-white px-4 py-4 rounded-xl border border-border"
          placeholder="Email"
          placeholderTextColor="#8888A8"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          className="bg-surface2 text-white px-4 py-4 rounded-xl border border-border"
          placeholder="Username"
          placeholderTextColor="#8888A8"
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          className="bg-surface2 text-white px-4 py-4 rounded-xl border border-border"
          placeholder="Password"
          placeholderTextColor="#8888A8"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          className="bg-surface2 text-white px-4 py-4 rounded-xl border border-border mb-6"
          placeholder="Confirm password"
          placeholderTextColor="#8888A8"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <Button title="Create Account" onPress={handleRegister} loading={loading} />

        <Link href="/(auth)/login" asChild>
          <Button title="Already have an account? Log in" variant="ghost" />
        </Link>
      </View>
    </View>
  );
}
