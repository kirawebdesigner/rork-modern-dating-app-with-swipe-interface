import { Stack } from 'expo-router';
import React from 'react';

export default function MessagesStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
