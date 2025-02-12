import { Tabs } from 'expo-router';
import React from 'react';

import { TabBarIcon } from '@/components/navigation/TabBarIcon';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home'
        }}
      />
      <Tabs.Screen
        name="mapScreen"
        options={{
          title: 'Map'
        }}
      />
      <Tabs.Screen
        name="routeScreen"
        options={{
          title: 'Route'
        }}
      />
    </Tabs>
  );
}
