import { useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppButton, AppInput, Card, ChipRow, EmptyState, Loading, Muted, Row, Screen, Title } from '../components/ui'
import { organizationsApi, sitesApi } from '../api/endpoints'
import { apiErrorMessage } from '../api/client'
import type { PlaceCategory } from '../types'
import { makeStyles, useTheme } from '../theme/ThemeProvider'

const CATEGORIES: { value: PlaceCategory; label: string }[] = [
  { value: 'CAFE', label: 'Café' },
  { value: 'RESTAURANT', label: 'Restaurant' },
  { value: 'MALL', label: 'Mall' },
  { value: 'OFFICE', label: 'Office' },
  { value: 'HOTEL', label: 'Hotel' },
  { value: 'HOSPITAL', label: 'Hospital' },
  { value: 'EVENT_VENUE', label: 'Event' },
  { value: 'OTHER', label: 'Other' },
]

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((item) => [item.value, item.label]),
)

export default function AdminSitesScreen() {
  const styles = useStyles()
  const { colors } = useTheme()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [organizationId, setOrganizationId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [city, setCity] = useState('')
  const [category, setCategory] = useState<PlaceCategory>('OFFICE')
  const [description, setDescription] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')
  const [openingHours, setOpeningHours] = useState('')
  const [amenities, setAmenities] = useState('')
  const [error, setError] = useState<string | null>(null)

  const sitesQuery = useQuery({ queryKey: ['sites'], queryFn: () => sitesApi.list() })
  const orgsQuery = useQuery({ queryKey: ['organizations'], queryFn: () => organizationsApi.list() })

  const reset = () => {
    setName('')
    setCode('')
    setCity('')
    setDescription('')
    setCoverImageUrl('')
    setHourlyRate('')
    setOpeningHours('')
    setAmenities('')
    setCategory('OFFICE')
  }

  const createMutation = useMutation({
    mutationFn: () =>
      sitesApi.create({
        organizationId: organizationId ?? orgsQuery.data?.[0]?.id,
        name,
        code,
        city: city || null,
        category,
        description: description || null,
        coverImageUrl: coverImageUrl || null,
        hourlyRate: hourlyRate ? Number(hourlyRate) : null,
        openingHours: openingHours || null,
        amenities: amenities || null,
        active: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] })
      queryClient.invalidateQueries({ queryKey: ['places'] })
      setShowForm(false)
      reset()
      setError(null)
    },
    onError: (err) => setError(apiErrorMessage(err)),
  })

  if (sitesQuery.isLoading) {
    return (
      <Screen>
        <Loading />
      </Screen>
    )
  }

  const sites = sitesQuery.data ?? []

  return (
    <Screen>
      <Row between>
        <Title size={22}>Parking sites</Title>
        <AppButton label={showForm ? 'Cancel' : '+ Add'} variant={showForm ? 'ghost' : 'primary'} onPress={() => setShowForm((v) => !v)} />
      </Row>

      {showForm ? (
        <Card>
          <Muted>Organization</Muted>
          <ChipRow
            options={(orgsQuery.data ?? []).map((org) => ({ value: String(org.id), label: org.code }))}
            value={String(organizationId ?? orgsQuery.data?.[0]?.id ?? '')}
            onChange={(value) => setOrganizationId(Number(value))}
          />
          <AppInput value={name} onChangeText={setName} placeholder="Site name" />
          <AppInput value={code} onChangeText={setCode} placeholder="Site code" autoCapitalize="none" />
          <AppInput value={city} onChangeText={setCity} placeholder="City" />
          <AppInput value={description} onChangeText={setDescription} placeholder="Short description" multiline />
          <Muted>Category</Muted>
          <ChipRow options={CATEGORIES} value={category} onChange={setCategory} />
          <Row>
            <AppInput value={hourlyRate} onChangeText={setHourlyRate} placeholder="₹ / hour" keyboardType="numeric" />
            <AppInput value={openingHours} onChangeText={setOpeningHours} placeholder="Hours (8:00 AM – 11:00 PM)" />
          </Row>
          <AppInput
            value={coverImageUrl}
            onChangeText={setCoverImageUrl}
            placeholder="Cover image URL (/places/cafe-1.jpg)"
            autoCapitalize="none"
          />
          <AppInput
            value={amenities}
            onChangeText={setAmenities}
            placeholder="Amenities: EV_CHARGING,COVERED,CCTV,VALET"
            autoCapitalize="none"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <AppButton
            label="Create site"
            onPress={() => createMutation.mutate()}
            loading={createMutation.isPending}
            disabled={!name || !code}
          />
        </Card>
      ) : null}

      {sites.length === 0 ? (
        <EmptyState title="No sites" />
      ) : (
        sites.map((site) => (
          <Card key={site.id}>
            <Row between>
              <Title size={16}>{site.name}</Title>
              {site.category ? <Muted>{CATEGORY_LABEL[site.category] ?? site.category}</Muted> : null}
            </Row>
            <Muted>
              {site.code} · {site.organizationName} · {site.city ?? 'no city'}
              {site.hourlyRate != null ? ` · ₹${Number(site.hourlyRate).toFixed(0)}/hr` : ''}
            </Muted>
            {site.openingHours ? <Muted>{site.openingHours}</Muted> : null}
          </Card>
        ))
      )}
    </Screen>
  )
}

const useStyles = makeStyles((colors) => StyleSheet.create({
  error: { color: colors.danger, fontSize: 13 },
}))
