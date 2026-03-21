import React, { useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  DrawerContentScrollView,
  createDrawerNavigator,
} from '@react-navigation/drawer';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import MyTasksScreen from '../screens/MyTasksScreen';
import PayoutsWalletScreen from '../screens/PayoutsWalletScreen';
import NoticeBoardScreen from '../screens/NoticeBoardScreen';
import TeamChatScreen from '../screens/TeamChatScreen';
import LeaveApplicationScreen from '../screens/LeaveApplicationScreen';
import HelpdeskScreen from '../screens/HelpdeskScreen';
import CustomerSupportScreen from '../screens/CustomerSupportScreen';
import KnowledgeBaseScreen from '../screens/KnowledgeBaseScreen';
import MeetingsScreen from '../screens/MeetingsScreen';
import MyIdCardScreen from '../screens/MyIdCardScreen';
import { COLORS, NAV_THEME, SHADOWS, SIZES } from '../constants/theme';
import {
  clearStaffSession,
  getStoredProfile,
  getStoredToken,
  storeStaffSession,
  updateStoredProfile,
} from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { getInitials } from '../utils/staffWorkspace';

const RootStack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

const DRAWER_ROUTES = [
  {
    name: 'DashboardHome',
    label: 'Dashboard Home',
    icon: 'grid-outline',
    component: HomeScreen,
  },
  {
    name: 'Attendance',
    label: 'Attendance',
    icon: 'time-outline',
    component: AttendanceScreen,
  },
  {
    name: 'MyTasks',
    label: 'My Tasks',
    icon: 'checkbox-outline',
    component: MyTasksScreen,
  },
  {
    name: 'PayoutsWallet',
    label: 'Payouts & Wallet',
    icon: 'wallet-outline',
    component: PayoutsWalletScreen,
  },
  {
    name: 'NoticeBoard',
    label: 'Notice Board',
    icon: 'notifications-outline',
    component: NoticeBoardScreen,
  },
  {
    name: 'TeamChat',
    label: 'Team Chat',
    icon: 'chatbubbles-outline',
    component: TeamChatScreen,
  },
  {
    name: 'LeaveApplication',
    label: 'Leave Application',
    icon: 'calendar-outline',
    component: LeaveApplicationScreen,
  },
  {
    name: 'Helpdesk',
    label: 'Helpdesk 🎧',
    icon: 'headset-outline',
    component: HelpdeskScreen,
  },
  {
    name: 'CustomerSupport',
    label: 'Customer Support 🎧',
    icon: 'people-circle-outline',
    component: CustomerSupportScreen,
  },
  {
    name: 'KnowledgeBase',
    label: 'Knowledge Base 📚',
    icon: 'book-outline',
    component: KnowledgeBaseScreen,
  },
  {
    name: 'Meetings',
    label: 'Meetings 🎬',
    icon: 'videocam-outline',
    component: MeetingsScreen,
  },
  {
    name: 'MyIdCard',
    label: 'My ID Card',
    icon: 'card-outline',
    component: MyIdCardScreen,
  },
];

function DrawerProfileAvatar({ profile }) {
  if (profile?.profilePhoto) {
    return (
      <Image
        source={{ uri: profile.profilePhoto }}
        style={styles.drawerAvatarImage}
      />
    );
  }

  return (
    <View style={styles.drawerAvatarFallback}>
      <Text style={styles.drawerAvatarFallbackText}>
        {getInitials(profile?.name)}
      </Text>
    </View>
  );
}

function CustomDrawerContent(props) {
  const auth = useContext(AuthContext);
  const profile = auth?.profile;

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={styles.drawerContentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.drawerBrandCard}>
        <View style={styles.drawerBrandBadge}>
          <Ionicons name="sparkles-outline" size={18} color={COLORS.white} />
        </View>
        <Text style={styles.drawerBrandTitle}>VibeSphere</Text>
        <Text style={styles.drawerBrandSubtitle}>
          Staff mobile workspace navigation skeleton.
        </Text>
      </View>

      <View style={styles.drawerProfileCard}>
        <DrawerProfileAvatar profile={profile} />
        <View style={styles.drawerProfileCopy}>
          <Text style={styles.drawerProfileName} numberOfLines={1}>
            {profile?.name || 'Staff Member'}
          </Text>
          <Text style={styles.drawerProfileEmail} numberOfLines={1}>
            {profile?.email || 'staff@vibespheremedia.in'}
          </Text>
        </View>
      </View>

      <View style={styles.drawerNavGroup}>
        {props.state.routes.map((route, index) => {
          const focused = index === props.state.index;
          const options = props.descriptors[route.key].options;
          const label = options.drawerLabel || route.name;
          const icon = options.drawerIcon
            ? options.drawerIcon({
                focused,
                size: 20,
                color: focused ? COLORS.white : COLORS.textSecondary,
              })
            : null;

          return (
            <Pressable
              key={route.key}
              onPress={() => props.navigation.navigate(route.name)}
              style={({ pressed }) => [
                styles.drawerNavItem,
                focused && styles.drawerNavItemActive,
                pressed && !focused && styles.drawerNavItemPressed,
              ]}
            >
              <View style={styles.drawerNavIcon}>{icon}</View>
              <Text
                style={[
                  styles.drawerNavLabel,
                  focused && styles.drawerNavLabelActive,
                ]}
              >
                {label}
              </Text>
              {focused ? (
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={COLORS.white}
                />
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.drawerFooterCard}>
        <Text style={styles.drawerFooterTitle}>Secure session</Text>
        <Text style={styles.drawerFooterBody}>
          Your staff session stays inside secure storage and loads before the
          drawer opens.
        </Text>
        <Pressable
          onPress={auth?.signOut}
          style={({ pressed }) => [
            styles.drawerLogoutButton,
            pressed && styles.drawerLogoutButtonPressed,
          ]}
        >
          <Ionicons name="log-out-outline" size={18} color={COLORS.danger} />
          <Text style={styles.drawerLogoutText}>Sign out</Text>
        </Pressable>
      </View>
    </DrawerContentScrollView>
  );
}

function StaffDrawerNavigator() {
  return (
    <Drawer.Navigator
      initialRouteName="DashboardHome"
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        sceneContainerStyle: { backgroundColor: COLORS.background },
        overlayColor: COLORS.overlay,
        drawerType: 'slide',
        swipeEdgeWidth: 80,
        drawerStyle: styles.drawerShell,
      }}
    >
      {DRAWER_ROUTES.map((route) => (
        <Drawer.Screen
          key={route.name}
          name={route.name}
          component={route.component}
          options={{
            drawerLabel: route.label,
            drawerIcon: ({ color, size }) => (
              <Ionicons name={route.icon} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Drawer.Navigator>
  );
}

function BootSplash() {
  return (
    <View style={styles.bootContainer}>
      <View style={styles.bootOrb} />
      <View style={styles.bootCard}>
        <View style={styles.bootBadge}>
          <Ionicons name="sparkles" size={18} color={COLORS.white} />
        </View>
        <Text style={styles.bootTitle}>VibeSphere Staff</Text>
        <Text style={styles.bootSubtitle}>
          Restoring your staff workspace and drawer navigation...
        </Text>
        <ActivityIndicator size="small" color={COLORS.accent} />
      </View>
    </View>
  );
}

export default function AppNavigator() {
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [session, setSession] = useState({ token: null, profile: null });

  useEffect(() => {
    async function restoreSession() {
      try {
        const [token, profile] = await Promise.all([
          getStoredToken(),
          getStoredProfile(),
        ]);

        if (token) {
          setSession({ token, profile });
        }
      } catch (error) {
        console.error('Failed to restore staff session.', error);
      } finally {
        setIsBootstrapping(false);
      }
    }

    restoreSession();
  }, []);

  async function signIn({ token, staff }) {
    await storeStaffSession(token, staff);
    setSession((current) => ({
      token,
      profile: staff || current.profile || null,
    }));
  }

  async function updateProfile(staff) {
    await updateStoredProfile(staff);
    setSession((current) => ({
      ...current,
      profile: staff || current.profile || null,
    }));
  }

  async function signOut() {
    await clearStaffSession();
    setSession({ token: null, profile: null });
  }

  if (isBootstrapping) {
    return <BootSplash />;
  }

  return (
    <AuthContext.Provider
      value={{
        token: session.token,
        profile: session.profile,
        signIn,
        signOut,
        updateProfile,
      }}
    >
      <NavigationContainer theme={NAV_THEME}>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          {session.token ? (
            <RootStack.Screen name="Workspace" component={StaffDrawerNavigator} />
          ) : (
            <RootStack.Screen name="Login" component={LoginScreen} />
          )}
        </RootStack.Navigator>
      </NavigationContainer>
    </AuthContext.Provider>
  );
}

const styles = StyleSheet.create({
  bootContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    padding: SIZES.xxl,
  },
  bootOrb: {
    position: 'absolute',
    top: 84,
    width: 220,
    height: 220,
    borderRadius: 220,
    backgroundColor: COLORS.primarySoft,
    opacity: 0.75,
  },
  bootCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: SIZES.radiusLg,
    backgroundColor: COLORS.surface,
    padding: SIZES.xxxl,
    alignItems: 'center',
    gap: SIZES.md,
    ...SHADOWS.medium,
  },
  bootBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  bootTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  bootSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  drawerShell: {
    width: 312,
    backgroundColor: COLORS.surface,
    borderTopRightRadius: SIZES.radiusLg,
    borderBottomRightRadius: SIZES.radiusLg,
  },
  drawerContentContainer: {
    flexGrow: 1,
    paddingTop: SIZES.xxl,
    paddingHorizontal: SIZES.lg,
    paddingBottom: SIZES.xxl,
  },
  drawerBrandCard: {
    borderRadius: SIZES.radiusLg,
    backgroundColor: COLORS.primary,
    padding: SIZES.xxl,
    marginBottom: SIZES.lg,
    ...SHADOWS.medium,
  },
  drawerBrandBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    marginBottom: SIZES.lg,
  },
  drawerBrandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -0.6,
  },
  drawerBrandSubtitle: {
    marginTop: SIZES.sm,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.74)',
  },
  drawerProfileCard: {
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.lg,
    marginBottom: SIZES.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.md,
  },
  drawerAvatarImage: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: COLORS.primarySoft,
  },
  drawerAvatarFallback: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primarySoft,
  },
  drawerAvatarFallbackText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  drawerProfileCopy: {
    flex: 1,
    gap: 2,
  },
  drawerProfileName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  drawerProfileEmail: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  drawerNavGroup: {
    gap: SIZES.sm,
    marginBottom: 'auto',
  },
  drawerNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.md,
    borderRadius: 18,
    paddingHorizontal: SIZES.lg,
    paddingVertical: 14,
  },
  drawerNavItemActive: {
    backgroundColor: COLORS.primary,
    ...SHADOWS.soft,
  },
  drawerNavItemPressed: {
    backgroundColor: COLORS.surfaceAlt,
  },
  drawerNavIcon: {
    width: 22,
    alignItems: 'center',
  },
  drawerNavLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  drawerNavLabelActive: {
    color: COLORS.white,
  },
  drawerFooterCard: {
    marginTop: SIZES.xxl,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceAlt,
    padding: SIZES.lg,
    gap: SIZES.md,
  },
  drawerFooterTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  drawerFooterBody: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
  },
  drawerLogoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.sm,
    borderRadius: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.dangerSoft,
  },
  drawerLogoutButtonPressed: {
    opacity: 0.82,
  },
  drawerLogoutText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.danger,
  },
});
