import { useState } from 'react'
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AppButton,
  AppInput,
  Card,
  ChipRow,
  Divider,
  Muted,
  Row,
  Screen,
  Title,
} from '../components/ui'
import { occupancyApi, spacesApi, zonesApi } from '../api/endpoints'
import { apiErrorMessage } from '../api/client'
import { detectOccupancy, proposeSlots, visionHealth, type DetectResult, type DetectSlot, type ProposeResult, type UploadFile } from '../api/vision'
import { spacing } from '../theme/palette'
import { makeStyles, useTheme } from '../theme/ThemeProvider'

type Mode = 'propose' | 'detect'

function parsePolygon(raw?: string | null): number[][] | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length >= 3 && Array.isArray(parsed[0])) {
      return parsed as number[][]
    }
  } catch {
    /* stored polygon is not JSON */
  }
  return null
}

/** Prefer the verified bay outline captured at survey time; fall back to its anchor point. */
function slotsFromSpaces(spaces: { id: number; code?: string | null; active: boolean; polygon?: string | null; positionX?: number | null; positionY?: number | null }[]): DetectSlot[] {
  const slots: DetectSlot[] = []
  for (const space of spaces) {
    if (!space.active) continue
    const polygon = parsePolygon(space.polygon)
    if (polygon) {
      slots.push({ id: space.code ?? `#${space.id}`, space_id: space.id, polygon })
      continue
    }
    if (space.positionX != null && space.positionY != null) {
      const x = space.positionX
      const y = space.positionY
      slots.push({
        id: space.code ?? `#${space.id}`,
        space_id: space.id,
        polygon: [
          [x, y],
          [x + 84, y],
          [x + 84, y + 104],
          [x, y + 104],
        ],
      })
    }
  }
  return slots
}

export default function CameraScreen() {
  const styles = useStyles()
  const { colors } = useTheme()
  const queryClient = useQueryClient()
  const [zoneId, setZoneId] = useState<number | null>(null)
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null)
  const [mode, setMode] = useState<Mode>('propose')
  const [detectionMode, setDetectionMode] = useState('auto')
  const [rows, setRows] = useState('3')
  const [cols, setCols] = useState('4')
  const [cameraCode, setCameraCode] = useState('CAM-L1')
  const [proposal, setProposal] = useState<ProposeResult | null>(null)
  const [detection, setDetection] = useState<DetectResult | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const zonesQuery = useQuery({ queryKey: ['zones'], queryFn: () => zonesApi.list() })
  const zones = zonesQuery.data ?? []
  const activeZoneId = zoneId ?? zones[0]?.id ?? null

  const spacesQuery = useQuery({
    queryKey: ['spaces', activeZoneId],
    queryFn: () => spacesApi.list(activeZoneId as number),
    enabled: activeZoneId != null,
  })

  const healthQuery = useQuery({ queryKey: ['vision-health'], queryFn: visionHealth, retry: 0 })

  const toUpload = (picked: ImagePicker.ImagePickerAsset): UploadFile => ({
    uri: picked.uri,
    name: picked.fileName ?? 'capture.jpg',
    type: picked.mimeType ?? 'image/jpeg',
  })

  const pick = async (fromCamera: boolean) => {
    setError(null)
    setProposal(null)
    setDetection(null)
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      setError('Permission denied for camera or photos')
      return
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 })
    if (!result.canceled && result.assets[0]) {
      setAsset(result.assets[0])
    }
  }

  const proposeMutation = useMutation({
    mutationFn: () => proposeSlots(toUpload(asset as ImagePicker.ImagePickerAsset), {
      mode: detectionMode,
      rows: Number(rows) || 3,
      cols: Number(cols) || 4,
    }),
    onSuccess: (data) => {
      setProposal(data)
      setDetection(null)
      setMessage(`${data.count} slot(s) proposed via ${data.method}`)
    },
    onError: (err) => setError(apiErrorMessage(err)),
  })

  const detectMutation = useMutation({
    mutationFn: () => {
      const slots = slotsFromSpaces(spacesQuery.data ?? [])
      if (slots.length === 0) {
        throw new Error('This zone has no positioned spaces')
      }
      return detectOccupancy(toUpload(asset as ImagePicker.ImagePickerAsset), slots)
    },
    onSuccess: (data) => {
      setDetection(data)
      setProposal(null)
      setMessage(`${data.occupied} occupied · ${data.vacant} vacant (threshold ${data.threshold})`)
    },
    onError: (err) => setError(apiErrorMessage(err)),
  })

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!proposal || activeZoneId == null) return 0
      for (const slot of proposal.slots) {
        const centroid = slot.polygon.reduce(
          (accumulator, point) => ({ x: accumulator.x + point[0], y: accumulator.y + point[1] }),
          { x: 0, y: 0 },
        )
        await spacesApi.create({
          zoneId: activeZoneId,
          code: null,
          label: slot.label,
          polygon: JSON.stringify(slot.polygon),
          positionX: centroid.x / slot.polygon.length,
          positionY: centroid.y / slot.polygon.length,
          verificationStatus: 'PROPOSED',
          operationalState: 'IN_SERVICE',
        })
      }
      return proposal.slots.length
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['spaces'] })
      queryClient.invalidateQueries({ queryKey: ['zones'] })
      setMessage(`${count} proposed space(s) created — verify them in the zone view`)
    },
    onError: (err) => setError(apiErrorMessage(err)),
  })

  const pushMutation = useMutation({
    mutationFn: async () => {
      if (!detection) return 0
      const frameId = `mobile-${Date.now()}`
      let pushed = 0
      for (const item of detection.detections) {
        if (item.spaceId == null) continue
        await occupancyApi.record({
          spaceId: item.spaceId,
          state: item.state,
          source: 'CAMERA',
          confidence: item.confidence,
          externalId: `${cameraCode}:${frameId}:${item.spaceId}`,
          note: `vision:${item.method}`,
        })
        pushed += 1
      }
      return pushed
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['spaces'] })
      queryClient.invalidateQueries({ queryKey: ['zones'] })
      setMessage(`${count} occupancy event(s) pushed`)
    },
    onError: (err) => setError(apiErrorMessage(err)),
  })

  const overlay = proposal?.overlay ?? detection?.overlay ?? null
  const visionDown = healthQuery.isError

  return (
    <Screen>
      <Row between>
        <Title size={24}>Camera</Title>
        <View style={[styles.pill, { borderColor: visionDown ? colors.textSecondary : colors.success }]}>
          <Text style={[styles.pillText, { color: visionDown ? colors.textSecondary : colors.success }]}>
            {visionDown ? 'Vision offline' : 'Vision online'}
          </Text>
        </View>
      </Row>
      {visionDown ? (
        <Muted>Start it with: cd vision-service &amp;&amp; .venv/bin/uvicorn app.main:app --port 8001</Muted>
      ) : null}

      <Card>
        <Muted>Zone</Muted>
        <ChipRow
          options={zones.map((zone) => ({ value: String(zone.id), label: zone.code }))}
          value={String(activeZoneId ?? '')}
          onChange={(value) => setZoneId(Number(value))}
        />
        <Row>
          <AppButton label="Take photo" variant="outline" style={styles.flex} onPress={() => pick(true)} />
          <AppButton label="Choose photo" variant="outline" style={styles.flex} onPress={() => pick(false)} />
        </Row>
        <AppInput value={cameraCode} onChangeText={setCameraCode} placeholder="Camera code" autoCapitalize="none" />
        <Muted>Mode</Muted>
        <ChipRow
          options={[
            { value: 'propose' as Mode, label: 'Propose slots' },
            { value: 'detect' as Mode, label: 'Detect occupancy' },
          ]}
          value={mode}
          onChange={setMode}
        />

        {mode === 'propose' ? (
          <>
            <Muted>Detection</Muted>
            <ChipRow
              options={[
                { value: 'auto', label: 'Auto' },
                { value: 'lines', label: 'Lines' },
                { value: 'grid', label: 'Grid' },
              ]}
              value={detectionMode}
              onChange={setDetectionMode}
            />
            <Row>
              <View style={styles.flex}>
                <AppInput value={rows} onChangeText={setRows} placeholder="Rows" keyboardType="numeric" />
              </View>
              <View style={styles.flex}>
                <AppInput value={cols} onChangeText={setCols} placeholder="Cols" keyboardType="numeric" />
              </View>
            </Row>
            <AppButton
              label={proposeMutation.isPending ? 'Analysing…' : 'Propose slots'}
              onPress={() => proposeMutation.mutate()}
              loading={proposeMutation.isPending}
              disabled={!asset || visionDown}
            />
            {proposal ? (
              <AppButton
                label={`Import ${proposal.count} as proposed spaces`}
                variant="outline"
                onPress={() => importMutation.mutate()}
                loading={importMutation.isPending}
              />
            ) : null}
          </>
        ) : (
          <>
            <Muted>{spacesQuery.data?.length ?? 0} space(s) in this zone</Muted>
            <AppButton
              label={detectMutation.isPending ? 'Detecting…' : 'Detect occupancy'}
              onPress={() => detectMutation.mutate()}
              loading={detectMutation.isPending}
              disabled={!asset || visionDown}
            />
            {detection ? (
              <AppButton
                label={`Push ${detection.detections.length} occupancy event(s)`}
                variant="outline"
                onPress={() => pushMutation.mutate()}
                loading={pushMutation.isPending}
              />
            ) : null}
          </>
        )}
      </Card>

      {asset ? (
        <Card>
          <Image
            source={{ uri: overlay ? `data:image/png;base64,${overlay}` : asset.uri }}
            style={styles.image}
            resizeMode="contain"
          />
        </Card>
      ) : (
        <Muted>Take or choose a photo of the parking area to begin.</Muted>
      )}

      {detection ? (
        <Card>
          <Title size={16}>Detections</Title>
          <ScrollView style={styles.list} nestedScrollEnabled>
            {detection.detections.map((item) => (
              <View key={item.slotId}>
                <Row between>
                  <Text style={styles.slot}>{item.slotId}</Text>
                  <Text style={{ color: item.state === 'OCCUPIED' ? colors.danger : colors.success, fontWeight: '700' }}>
                    {item.state}
                  </Text>
                </Row>
                <Muted>
                  score {item.score.toFixed(3)} · conf {item.confidence.toFixed(2)} · {item.method}
                </Muted>
                <Divider />
              </View>
            ))}
          </ScrollView>
        </Card>
      ) : null}

      {message ? <Text style={styles.message}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Screen>
  )
}

const useStyles = makeStyles((colors) => StyleSheet.create({
  flex: { flex: 1 },
  pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 12, fontWeight: '700' },
  image: { width: '100%', height: 220, borderRadius: 12 },
  list: { maxHeight: 220 },
  slot: { color: colors.text, fontWeight: '700' },
  message: { color: colors.success, fontSize: 13 },
  error: { color: colors.danger, fontSize: 13 },
}))
