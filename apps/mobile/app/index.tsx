import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function HomeScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'MiniAgent', headerShown: false }} />
      <View style={styles.container}>
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>M</Text>
        </View>
        <Text style={styles.title}>MiniAgent</Text>
        <Text style={styles.tagline}>ພວກເຮົາຄືມິນິເອເຈນ</Text>
        <Text style={styles.subtitle}>Phase 0 — Foundation scaffold complete</Text>
        <Text style={styles.hint}>Mobile app coming in Phase 8</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#014c8f',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#014c8f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#014c8f',
  },
  tagline: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffa426',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 16,
  },
  hint: {
    fontSize: 12,
    color: '#d1d5db',
    marginTop: 4,
  },
});
