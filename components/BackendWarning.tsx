import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { AlertCircle, RefreshCw, CheckCircle } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { checkBackendHealth, type BackendHealthStatus } from '@/lib/backend-health';

type BackendStatus = 'checking' | 'healthy' | 'unhealthy';

export default function BackendWarning() {
  const [status, setStatus] = useState<BackendStatus>('checking');
  const [healthStatus, setHealthStatus] = useState<BackendHealthStatus | null>(null);

  const checkBackend = async () => {
    setStatus('checking');
    
    const health = await checkBackendHealth();
    setHealthStatus(health);
    setStatus(health.isHealthy ? 'healthy' : 'unhealthy');
    
    if (Platform.OS === 'web') {
      if (health.isHealthy) {
        alert('✅ Backend is running correctly!');
      } else {
        alert(`❌ ${health.message}\n\nPlease ensure backend is running on port 8081`);
      }
    }
  };

  useEffect(() => {
    checkBackend();
    
    const interval = setInterval(checkBackend, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (status === 'healthy') {
    return null;
  }

  return (
    <View style={[
      styles.container,
      status === 'checking' && styles.containerChecking,
      status === 'unhealthy' && styles.containerUnhealthy,
    ]}>
      <View style={[
        styles.iconContainer,
        status === 'checking' && styles.iconChecking,
        status === 'unhealthy' && styles.iconUnhealthy,
      ]}>
        {status === 'checking' ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : status === 'unhealthy' ? (
          <AlertCircle size={16} color="#EF4444" />
        ) : (
          <CheckCircle size={16} color="#10B981" />
        )}
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>
          {status === 'checking' ? 'Checking Backend...' : 'Backend Offline'}
        </Text>
        <Text style={styles.description}>
          {status === 'checking' 
            ? 'Verifying server connection...'
            : healthStatus?.message || 'Backend server is not responding'
          }
        </Text>
      </View>
      <TouchableOpacity 
        onPress={checkBackend} 
        style={styles.testButton}
        disabled={status === 'checking'}
      >
        {status === 'checking' ? (
          <ActivityIndicator size="small" color={Colors.text.white} />
        ) : (
          <View style={styles.buttonContent}>
            <RefreshCw size={14} color={Colors.text.white} />
            <Text style={styles.testButtonText}>Retry</Text>
          </View>
        )}
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
  containerChecking: {
    backgroundColor: '#F0F9FF',
    borderColor: '#3B82F6',
  },
  containerUnhealthy: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFE5B4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconChecking: {
    backgroundColor: '#DBEAFE',
  },
  iconUnhealthy: {
    backgroundColor: '#FEE2E2',
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
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  testButtonText: {
    color: Colors.text.white,
    fontSize: 13,
    fontWeight: '600',
  },
});
