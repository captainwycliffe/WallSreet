import { View, Text, TextInput, Alert, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { useRouter, Link } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
    } catch (e) {
      Alert.alert('Error', 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-background justify-center px-6">
      <View className="items-center mb-10">
        <Text className="text-white text-3xl font-interBold">MT5 Monitor</Text>
        <Text className="text-textSecondary mt-2">Log in to your account</Text>
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
          className="bg-surface2 text-white px-4 py-4 rounded-xl border border-border mb-6"
          placeholder="Password"
          placeholderTextColor="#8888A8"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        
        <Button title="Login" onPress={handleLogin} loading={loading} />
        
        <Button 
          title="Demo Mode" 
          variant="secondary"
          onPress={() => { setEmail('demo@mt5app.com'); setPassword('demo1234'); }} 
        />

        <Link href="/(auth)/register" asChild>
          <Button title="Create an account" variant="ghost" />
        </Link>
      </View>
    </View>
  );
}
