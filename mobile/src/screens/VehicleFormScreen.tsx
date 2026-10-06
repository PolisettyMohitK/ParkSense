import { useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppButton, AppInput, Card, ChipRow, Muted, Screen, Title } from '../components/ui'
import { usersApi, vehiclesApi } from '../api/endpoints'
import { apiErrorMessage } from '../api/client'
import { useAuth } from '../store/AuthContext'
import type { VehicleType } from '../types'
import type { RootStackParamList } from '../navigation/types'
import { makeStyles, useTheme } from '../theme/ThemeProvider'

const TYPES: VehicleType[] = ['CAR', 'BIKE', 'SUV', 'TRUCK', 'EV', 'OTHER']

export default function VehicleFormScreen() {
  const styles = useStyles()
  const { colors } = useTheme()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const route = useRoute<RouteProp<RootStackParamList, 'VehicleForm'>>()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const isManager = user?.role === 'ADMIN' || user?.role === 'MANAGER'

  const existing = route.params?.vehicle
  const [plateNumber, setPlateNumber] = useState(existing?.plateNumber ?? '')
  const [make, setMake] = useState(existing?.make ?? '')
  const [model, setModel] = useState(existing?.model ?? '')
  const [color, setColor] = useState(existing?.color ?? '')
  const [type, setType] = useState<VehicleType>(existing?.type ?? 'CAR')
  const [ownerId, setOwnerId] = useState<number | null>(existing?.ownerId ?? user?.id ?? null)
  const [error, setError] = useState<string | null>(null)

  const usersQuery = useQuery({ queryKey: ['users'], queryFn: () => usersApi.list(), enabled: isManager })

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        ownerId: ownerId ?? user?.id,
        plateNumber,
        make: make || null,
        model: model || null,
        color: color || null,
        type,
      }
      return existing ? vehiclesApi.update(existing.id, payload) : vehiclesApi.create(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      navigation.goBack()
    },
    onError: (err) => setError(apiErrorMessage(err)),
  })

  return (
    <Screen>
      <Title size={22}>{existing ? 'Edit vehicle' : 'Add vehicle'}</Title>

      <Card>
        {isManager ? (
          <>
            <Muted>Owner</Muted>
            <ChipRow
              options={(usersQuery.data ?? []).map((item) => ({
                value: String(item.id),
                label: item.fullName.split(' ')[0],
              }))}
              value={String(ownerId ?? '')}
              onChange={(value) => setOwnerId(Number(value))}
            />
          </>
        ) : null}

        <AppInput value={plateNumber} onChangeText={setPlateNumber} placeholder="Plate number" autoCapitalize="none" />
        <AppInput value={make} onChangeText={setMake} placeholder="Make (e.g. Toyota)" />
        <AppInput value={model} onChangeText={setModel} placeholder="Model (e.g. Corolla)" />
        <AppInput value={color} onChangeText={setColor} placeholder="Colour" />

        <Muted>Type</Muted>
        <ChipRow options={TYPES.map((item) => ({ value: item, label: item }))} value={type} onChange={setType} />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <AppButton
          label={saveMutation.isPending ? 'Saving…' : 'Save vehicle'}
          onPress={() => saveMutation.mutate()}
          loading={saveMutation.isPending}
          disabled={!plateNumber}
        />
      </Card>
    </Screen>
  )
}

const useStyles = makeStyles((colors) => StyleSheet.create({
  error: { color: colors.danger, fontSize: 13 },
}))
