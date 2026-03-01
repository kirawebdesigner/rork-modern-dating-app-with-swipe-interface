import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';

export default function ProfileDetailsIndex() {
  const router = useRouter();

  React.useEffect(() => {
    router.back();
  }, [router]);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  text: {
    color: Colors.text.secondary,
    fontSize: 16,
  },
});
