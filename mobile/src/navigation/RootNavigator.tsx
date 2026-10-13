import { DarkTheme, DefaultTheme, NavigationContainer, type Theme } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import LoginScreen from '../screens/LoginScreen'
import RegisterScreen from '../screens/RegisterScreen'
import AccountScreen from '../screens/AccountScreen'
import LockScreen from '../screens/LockScreen'
import ExploreScreen from '../screens/ExploreScreen'
import PlaceDetailScreen from '../screens/PlaceDetailScreen'
import BookingsScreen from '../screens/BookingsScreen'
import HomeScreen from '../screens/HomeScreen'
import ZonesScreen from '../screens/ZonesScreen'
import ZoneDetailScreen from '../screens/ZoneDetailScreen'
import MapScreen from '../screens/MapScreen'
import CameraScreen from '../screens/CameraScreen'
import ProfileScreen from '../screens/ProfileScreen'
import SettingsScreen from '../screens/SettingsScreen'
import NewReservationScreen from '../screens/NewReservationScreen'
import SessionsScreen from '../screens/SessionsScreen'
import VehiclesScreen from '../screens/VehiclesScreen'
import VehicleFormScreen from '../screens/VehicleFormScreen'
import AdminUsersScreen from '../screens/AdminUsersScreen'
import AdminOrganizationsScreen from '../screens/AdminOrganizationsScreen'
import AdminSitesScreen from '../screens/AdminSitesScreen'
import AdminDevicesScreen from '../screens/AdminDevicesScreen'
import { Loading } from '../components/ui'
import { useAuth } from '../store/AuthContext'
import { useTheme } from '../theme/ThemeProvider'
import type { RootStackParamList, TabParamList } from './types'

const Stack = createNativeStackNavigator<RootStackParamList>()
const Tab = createBottomTabNavigator<TabParamList>()

/**
 * Tab icon: the active tab gets a holo halo above it, so the indicator is not
 * colour-only.
 */
function TabGlyph({ name, color }: { name: keyof typeof Ionicons.glyphMap; color: string }) {
  const active = color !== undefined
  return (
    <View style={[styles.tabGlyph, active ? { backgroundColor: 'rgba(92,225,255,0.10)' } : null]}>
      <Ionicons name={name} size={20} color={color} />
    </View>
  )
}

const styles = StyleSheet.create({
  tabGlyph: {
    width: 44,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

const TAB_ICONS: Record<keyof TabParamList, keyof typeof Ionicons.glyphMap> = {
  Explore: 'compass-outline',
  Home: 'stats-chart-outline',
  Bookings: 'calendar-outline',
  Zones: 'layers-outline',
  Map: 'map-outline',
  Camera: 'camera-outline',
  Profile: 'person-outline',
}

/**
 * Floating glass tab bar: blurred, inset from the edges, with the active tab
 * marked in holo. Four or five tabs, never more.
 */
function Tabs() {
  const { user } = useAuth()
  const { colors } = useTheme()
  const isManager = user?.role === 'ADMIN' || user?.role === 'MANAGER'

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.holo,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: 14,
          height: 60,
          paddingTop: 0,
          paddingBottom: 0,
          backgroundColor: colors.glass,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.hairlineStrong,
          borderRadius: 16,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOpacity: colors.light ? 0.12 : 0.4,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 6 },
          elevation: 8,
        },
        tabBarItemStyle: { paddingVertical: 0 },
        tabBarIcon: ({ focused }) => (
          <TabGlyph name={TAB_ICONS[route.name]} color={focused ? colors.holo : colors.textTertiary} />
        ),
      })}
    >
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{ tabBarAccessibilityLabel: 'Explore' }}
      />
      <Tab.Screen
        name="Bookings"
        component={BookingsScreen}
        options={{ tabBarAccessibilityLabel: 'Bookings' }}
      />
      {isManager ? (
        <>
          <Tab.Screen
            name="Camera"
            component={CameraScreen}
            options={{ tabBarAccessibilityLabel: 'Camera' }}
          />
          <Tab.Screen
            name="Home"
            component={HomeScreen}
            options={{ tabBarAccessibilityLabel: 'Operations' }}
          />
        </>
      ) : null}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarAccessibilityLabel: 'Profile' }}
      />
    </Tab.Navigator>
  )
}

export default function RootNavigator() {
  const { ready, token, locked } = useAuth()
  const { colors, scheme } = useTheme()

  if (!ready) {
    return <Loading label="Starting ParkSense…" />
  }
  if (locked) {
    return <LockScreen />
  }

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme
  const navTheme: Theme = {
    ...base,
    colors: {
      ...base.colors,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.hairline,
      primary: colors.holo,
      notification: colors.holo,
    },
  }

  const headerOptions = {
    headerStyle: { backgroundColor: colors.background },
    headerTintColor: colors.text,
    headerTitleStyle: { color: colors.text, fontWeight: '600' as const, fontSize: 16 },
    headerShadowVisible: false,
    headerBackTitleVisible: false,
    contentStyle: { backgroundColor: colors.background },
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={headerOptions}>
        {token ? (
          <>
            <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
            <Stack.Screen name="PlaceDetail" component={PlaceDetailScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ZoneDetail" component={ZoneDetailScreen} options={{ title: 'Zone' }} />
            <Stack.Screen name="Zones" component={ZonesScreen} options={{ title: 'Zones' }} />
            <Stack.Screen name="Map" component={MapScreen} options={{ title: 'Live Map' }} />
            <Stack.Screen
              name="NewReservation"
              component={NewReservationScreen}
              options={{ title: 'Reserve a spot' }}
            />
            <Stack.Screen name="Sessions" component={SessionsScreen} options={{ title: 'History & receipts' }} />
            <Stack.Screen name="Account" component={AccountScreen} options={{ title: 'Account' }} />
            <Stack.Screen name="Vehicles" component={VehiclesScreen} options={{ title: 'Vehicles' }} />
            <Stack.Screen name="VehicleForm" component={VehicleFormScreen} options={{ title: 'Vehicle' }} />
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
            <Stack.Screen name="AdminUsers" component={AdminUsersScreen} options={{ title: 'Users' }} />
            <Stack.Screen
              name="AdminOrganizations"
              component={AdminOrganizationsScreen}
              options={{ title: 'Organizations' }}
            />
            <Stack.Screen name="AdminSites" component={AdminSitesScreen} options={{ title: 'Parking sites' }} />
            <Stack.Screen name="AdminDevices" component={AdminDevicesScreen} options={{ title: 'Devices' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Sign up' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
