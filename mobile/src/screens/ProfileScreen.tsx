import { StyleSheet, Text, View } from 'react-native'
import { Pressable } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { AppButton, Badge, Card, Divider, Muted, Row, Screen, Title } from '../components/ui'
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
    { label: 'My reservations', onPress: () => navigation.navigate('Reservations') },
    { label: 'My sessions', onPress: () => navigation.navigate('Sessions') },
    { label: 'My vehicles', onPress: () => navigation.navigate('Vehicles') },
  ]

  const adminItems: { label: string; onPress: () => void }[] = []
  if (isAdmin) {
    adminItems.push({ label: 'Users', onPress: () => navigation.navigate('AdminUsers') })
    adminItems.push({ label: 'Organizations', onPress: () => navigation.navigate('AdminOrganizations') })
  }
  if (isManager) {
    adminItems.push({ label: 'Parking sites', onPress: () => navigation.navigate('AdminSites') })
    adminItems.push({ label: 'Monitoring devices', onPress: () => navigation.navigate('AdminDevices') })
  }

  return (
    <Screen>
      <Row between>
        <View>
          <Title size={24}>{user?.fullName}</Title>
          <Muted>{user?.email}</Muted>
        </View>
        <Badge kind="verification" value={isAdmin ? 'VERIFIED' : 'PROPOSED'} />
      </Row>

      <Card>
        <Row between>
          <Muted>Role</Muted>
          <Text style={styles.value}>{user?.role}</Text>
        </Row>
        <Row between>
          <Muted>Organization</Muted>
          <Text style={styles.value}>{user?.organizationName ?? '—'}</Text>
        </Row>
        <Row between>
          <Muted>Realtime</Muted>
          <Text style={[styles.value, { color: socketConnected ? colors.success : colors.textSecondary }]}>
            {socketConnected ? 'Connected' : 'Offline'}
          </Text>
        </Row>
      </Card>

      <Card>
        {items.map((item, index) => (
          <View key={item.label}>
            {index > 0 ? <Divider /> : null}
            <Pressable onPress={item.onPress}>
              <Row between>
                <Text style={styles.link}>{item.label}</Text>
                <Text style={styles.chevron}>›</Text>
              </Row>
            </Pressable>
          </View>
        ))}
      </Card>

      {adminItems.length > 0 ? (
        <Card>
          <Muted>Administration</Muted>
          {adminItems.map((item, index) => (
            <View key={item.label}>
              {index > 0 ? <Divider /> : null}
              <Pressable onPress={item.onPress}>
                <Row between>
                  <Text style={styles.link}>{item.label}</Text>
                  <Text style={styles.chevron}>›</Text>
                </Row>
              </Pressable>
            </View>
          ))}
        </Card>
      ) : null}

      <Card>
        <Pressable onPress={() => navigation.navigate('Settings')}>
          <Row between>
            <Text style={styles.link}>Settings</Text>
            <Text style={styles.chevron}>›</Text>
          </Row>
        </Pressable>
      </Card>

      <AppButton label="Sign out" variant="danger" onPress={() => logout()} />
    </Screen>
  )
}

const useStyles = makeStyles((colors) => StyleSheet.create({
  value: { color: colors.text, fontWeight: '600' },
  link: { color: colors.text, fontSize: 15, fontWeight: '600', paddingVertical: spacing.sm },
  chevron: { color: colors.textSecondary, fontSize: 20 },
}))
