import { Stack } from 'expo-router';
import React from 'react';

export default function PermissionsStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
