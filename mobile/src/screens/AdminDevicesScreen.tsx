import { useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppButton, AppInput, Badge, Card, ChipRow, EmptyState, Loading, Muted, Row, Screen, Title } from '../components/ui'
import { devicesApi, zonesApi } from '../api/endpoints'
import { apiErrorMessage } from '../api/client'
import type { DeviceType } from '../types'
import { makeStyles, useTheme } from '../theme/ThemeProvider'

export default function AdminDevicesScreen() {
  const styles = useStyles()
  const { colors } = useTheme()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [zoneId, setZoneId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [type, setType] = useState<DeviceType>('CAMERA')
  const [error, setError] = useState<string | null>(null)

  const devicesQuery = useQuery({ queryKey: ['devices'], queryFn: () => devicesApi.list() })
  const zonesQuery = useQuery({ queryKey: ['zones'], queryFn: () => zonesApi.list() })

  const createMutation = useMutation({
    mutationFn: () =>
      devicesApi.create({
        zoneId: zoneId ?? zonesQuery.data?.[0]?.id,
        name,
        code,
        type,
        status: 'OFFLINE',
        active: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] })
      setShowForm(false)
      setName('')
      setCode('')
      setError(null)
    },
    onError: (err) => setError(apiErrorMessage(err)),
  })

  if (devicesQuery.isLoading) {
    return (
      <Screen>
        <Loading />
      </Screen>
    )
  }

  const devices = devicesQuery.data ?? []

  return (
    <Screen>
      <Row between>
        <Title size={22}>Devices</Title>
        <AppButton label={showForm ? 'Cancel' : '+ Add'} variant={showForm ? 'ghost' : 'primary'} onPress={() => setShowForm((v) => !v)} />
      </Row>

      {showForm ? (
        <Card>
          <Muted>Zone</Muted>
          <ChipRow
            options={(zonesQuery.data ?? []).map((zone) => ({ value: String(zone.id), label: zone.code }))}
            value={String(zoneId ?? zonesQuery.data?.[0]?.id ?? '')}
            onChange={(value) => setZoneId(Number(value))}
          />
          <AppInput value={name} onChangeText={setName} placeholder="Device name" />
          <AppInput value={code} onChangeText={setCode} placeholder="Device code" autoCapitalize="none" />
          <Muted>Type</Muted>
          <ChipRow
            options={[
              { value: 'CAMERA' as DeviceType, label: 'Camera' },
              { value: 'SENSOR' as DeviceType, label: 'Sensor' },
              { value: 'MANUAL' as DeviceType, label: 'Manual' },
            ]}
            value={type}
            onChange={setType}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <AppButton
            label="Create device"
            onPress={() => createMutation.mutate()}
            loading={createMutation.isPending}
            disabled={!name || !code}
          />
        </Card>
      ) : null}

      {devices.length === 0 ? (
        <EmptyState title="No devices" />
      ) : (
        devices.map((device) => (
          <Card key={device.id}>
            <Row between>
              <Title size={16}>{device.name}</Title>
              <Badge kind="device" value={device.status} />
            </Row>
            <Muted>
              {device.code} · {device.type} · {device.zoneName}
            </Muted>
          </Card>
        ))
      )}
    </Screen>
  )
}

const useStyles = makeStyles((colors) => StyleSheet.create({
  error: { color: colors.danger, fontSize: 13 },
}))
