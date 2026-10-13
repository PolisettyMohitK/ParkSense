import { Alert, StyleSheet, Text, View } from 'react-native'
import { Pressable } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import {
  AppButton,
  Badge,
  Divider,
  ListRow,
  ListSection,
  LiveBadge,
  Muted,
  Row,
  Screen,
  Title,
} from '../components/ui'
import { useAuth } from '../store/AuthContext'
import { useSocketStatus } from '../hooks/useOccupancyStream'
import type { RootStackParamList } from '../navigation/types'
import { spacing } from '../theme/palette'
import { makeStyles, useTheme } from '../theme/ThemeProvider'

export default function ProfileScreen() {
  const styles = useStyles()
  const { colors } = useTheme()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { user, logout } = useAuth()
  const socketConnected = useSocketStatus()
  const isAdmin = user?.role === 'ADMIN'
  const isManager = isAdmin || user?.role === 'MANAGER'

  const items: { label: string; onPress: () => void; subtitle?: string }[] = [
    { label: 'My bookings', onPress: () => navigation.navigate('Tabs', { screen: 'Bookings' }) },
    { label: 'Parking history & receipts', onPress: () => navigation.navigate('Sessions') },
    { label: 'My vehicles', onPress: () => navigation.navigate('Vehicles') },
    { label: 'Account & password', onPress: () => navigation.navigate('Account') },
  ]

  const adminItems: { label: string; onPress: () => void }[] = []
  if (isAdmin) {
    adminItems.push({ label: 'Users', onPress: () => navigation.navigate('AdminUsers') })
    adminItems.push({ label: 'Organizations', onPress: () => navigation.navigate('AdminOrganizations') })
  }
  if (isManager) {
    adminItems.push({ label: 'Zones & spaces', onPress: () => navigation.navigate('Zones') })
    adminItems.push({ label: 'Live parking map', onPress: () => navigation.navigate('Map') })
    adminItems.push({ label: 'Parking sites', onPress: () => navigation.navigate('AdminSites') })
    adminItems.push({ label: 'Monitoring devices', onPress: () => navigation.navigate('AdminDevices') })
  }

  return (
    <Screen floatingTabs>
      <Row between>
        <View>
          <Title size={24}>{user?.fullName}</Title>
          <Muted>{user?.email}</Muted>
        </View>
        <Badge kind="role" value={user?.role ?? 'USER'} />
      </Row>

      {/* Two quiet sections plus the payment summary. No cards inside cards. */}
      <ListSection title="Details">
        <ListRow label="Role" value={user?.role === 'USER' ? 'Driver' : user?.role === 'ADMIN' ? 'Admin' : 'Manager'} />
        <ListRow label="Organization" value={user?.organizationName ?? '—'} />
        <ListRow label="Email" value={user?.email} last />
      </ListSection>

      <ListSection title="Account">
        {items.map((item, index) => (
          <ListRow
            key={item.label}
            label={item.label}
            onPress={item.onPress}
            last={index === items.length - 1}
          />
        ))}
      </ListSection>

      {adminItems.length > 0 ? (
        <ListSection title="Administration">
          {adminItems.map((item, index) => (
            <ListRow
              key={item.label}
              label={item.label}
              onPress={item.onPress}
              last={index === adminItems.length - 1}
            />
          ))}
        </ListSection>
      ) : null}
      <ListSection title="Preferences">
        <ListRow label="Settings" onPress={() => navigation.navigate('Settings')} last />
      </ListSection>

      <AppButton
        label="Sign out"
        variant="danger"
        onPress={() =>
          Alert.alert('Sign out?', 'You will need to sign in again to book parking.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign out', style: 'destructive', onPress: () => void logout() },
          ])
        }
      />
    </Screen>
  )
}

const useStyles = makeStyles((colors) => StyleSheet.create({
  value: { color: colors.text, fontWeight: '600' },
  link: { color: colors.text, fontSize: 15, fontWeight: '600', paddingVertical: spacing.sm },
  chevron: { color: colors.textSecondary, fontSize: 20 },
}))
