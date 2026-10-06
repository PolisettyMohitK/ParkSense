import { useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppButton, Card, EmptyState, Loading, Muted, Row, Screen, Title } from '../components/ui'
import { vehiclesApi } from '../api/endpoints'
import { apiErrorMessage } from '../api/client'
import type { RootStackParamList } from '../navigation/types'
import { spacing } from '../theme/palette'
import { makeStyles, useTheme } from '../theme/ThemeProvider'

export default function VehiclesScreen() {
  const styles = useStyles()
  const { colors } = useTheme()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const vehiclesQuery = useQuery({ queryKey: ['vehicles'], queryFn: () => vehiclesApi.list() })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => vehiclesApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
    onError: (err) => setError(apiErrorMessage(err)),
  })

  if (vehiclesQuery.isLoading) {
    return (
      <Screen>
        <Loading />
      </Screen>
    )
  }

  const vehicles = vehiclesQuery.data ?? []

  return (
    <Screen>
      <Row between>
        <Title size={24}>Vehicles</Title>
        <AppButton label="+ Add" onPress={() => navigation.navigate('VehicleForm', {})} />
      </Row>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {vehicles.length === 0 ? (
        <EmptyState title="No vehicles" subtitle="Add a vehicle to make reservations." />
      ) : (
        vehicles.map((vehicle) => (
          <Card key={vehicle.id}>
            <Row between>
              <Title size={17}>{vehicle.plateNumber}</Title>
              <Text style={styles.type}>{vehicle.type}</Text>
            </Row>
            <Muted>
              {[vehicle.make, vehicle.model, vehicle.color].filter(Boolean).join(' · ') || 'No details'}
            </Muted>
            <Muted>Owner: {vehicle.ownerName}</Muted>
            <Row>
              <AppButton
                label="Edit"
                variant="outline"
                style={styles.flex}
                onPress={() => navigation.navigate('VehicleForm', { vehicle })}
              />
              <AppButton
                label="Delete"
                variant="ghost"
                style={styles.flex}
                onPress={() => deleteMutation.mutate(vehicle.id)}
              />
            </Row>
          </Card>
        ))
      )}
    </Screen>
  )
}

const useStyles = makeStyles((colors) => StyleSheet.create({
  flex: { flex: 1 },
  type: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  error: { color: colors.danger, fontSize: 13 },
}))
