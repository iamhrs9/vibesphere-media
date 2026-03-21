import React from 'react';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DrawerActions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ChatListScreen from './ChatListScreen';
import ChatRoomScreen from './ChatRoomScreen';
import { COLORS } from '../constants/theme';

const Stack = createNativeStackNavigator();

function DrawerMenuButton({ onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: 40,
          height: 40,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: COLORS.surfaceAlt,
          marginRight: 8,
        },
        pressed && { opacity: 0.82 },
      ]}
    >
      <Ionicons name="menu-outline" size={22} color={COLORS.text} />
    </Pressable>
  );
}

export default function TeamChatScreen({ navigation }) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: COLORS.surface,
        },
        headerTintColor: COLORS.text,
        headerTitleStyle: {
          fontWeight: '800',
          color: COLORS.text,
        },
        contentStyle: {
          backgroundColor: COLORS.background,
        },
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen
        name="ChatList"
        component={ChatListScreen}
        options={{
          title: 'Chats',
          headerLeft: () => (
            <DrawerMenuButton
              onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
            />
          ),
        }}
      />
      <Stack.Screen
        name="ChatRoom"
        component={ChatRoomScreen}
        options={{
          title: 'Chat',
        }}
      />
    </Stack.Navigator>
  );
}
