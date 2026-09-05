import { View, Text, TextInput, Alert, StyleSheet } from 'react-native';
import { useState } from 'react';
import { useRouter, Link } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';

const C = {
  bg: '#0A0A0F',
  surface2: '#1C1C28',
  border: '#2A2A3A',
  white: '#FFFFFF',
  textSecondary: '#8888A8',
};

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
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Set up your MT5 Monitor account</Text>
      </View>

      <View>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={C.textSecondary}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor={C.textSecondary}
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={C.textSecondary}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          style={[styles.input, styles.inputLast]}
          placeholder="Confirm password"
          placeholderTextColor={C.textSecondary}
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    color: C.white,
    fontSize: 30,
    fontWeight: 'bold',
  },
  subtitle: {
    color: C.textSecondary,
    marginTop: 8,
  },
  input: {
    backgroundColor: C.surface2,
    color: C.white,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
  },
  inputLast: {
    marginBottom: 24,
  },
});
