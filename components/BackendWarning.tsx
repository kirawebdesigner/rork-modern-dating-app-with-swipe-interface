import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import Colors from '@/constants/colors';

export default function BackendWarning() {
  const checkBackend = async () => {
    try {
      const response = await fetch('http://localhost:8081/health', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.ok) {
        alert('✅ Backend is running correctly!');
      } else {
        alert('⚠️ Backend responded but with an error. Check console logs.');
      }
    } catch (e) {
      alert('❌ Cannot connect to backend!\n\nPlease run: bun backend/hono.ts');
    }
  };

  const openDocs = () => {
    Linking.openURL('https://github.com/');
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <AlertCircle size={16} color={Colors.warning} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>Backend Server Required</Text>
        <Text style={styles.description}>
          Make sure the backend is running before making payments
        </Text>
      </View>
      <TouchableOpacity onPress={checkBackend} style={styles.testButton}>
        <Text style={styles.testButtonText}>Test</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    borderWidth: 1,
    borderColor: '#FFD700',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFE5B4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  testButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  testButtonText: {
    color: Colors.text.white,
    fontSize: 13,
    fontWeight: '600',
  },
});
