import { useMemo, useState } from 'react'
import {
  Box,
  Button,
  ButtonGroup,
  Chip,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { motion, AnimatePresence } from 'framer-motion'
import ViewInArRoundedIcon from '@mui/icons-material/ViewInArRounded'
import MapRoundedIcon from '@mui/icons-material/MapRounded'
import ZoomInRoundedIcon from '@mui/icons-material/ZoomInRounded'
import ZoomOutRoundedIcon from '@mui/icons-material/ZoomOutRounded'
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded'
import DirectionsCarFilledRoundedIcon from '@mui/icons-material/DirectionsCarFilledRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import type { PublicSpace } from '../types'
import { STATUS } from '../theme'

export type ViewPerspective = 'isometric' | 'topdown' | 'driver'

interface ParkingLot3DViewerProps {
  spaces: PublicSpace[]
  selectedSpaceId: number | null
  onSelectSpace: (space: PublicSpace) => void
  /** Called from the "Reserve bay" banner once a bay is selected. */
  onConfirm?: (space: PublicSpace) => void
  isLoading?: boolean
  zoneName?: string
}

// Stylized miniature 3D vehicle rendered inside occupied stalls
function ParkedVehicle3D({ seed }: { seed: number }) {
  // Rotate vehicle colors between Apple monochrome metallic tones
  const palette = [
    { body: '#2C2C2E', roof: '#1C1C1E', glass: '#48484A', highlight: '#3A3A3C' }, // Obsidian
    { body: '#8E8E93', roof: '#636366', glass: '#3A3A3C', highlight: '#AEAEB2' }, // Silver
    { body: '#D1D1D6', roof: '#AEAEB2', glass: '#48484A', highlight: '#E5E5EA' }, // Pearl White
    { body: '#3A3A3C', roof: '#242426', glass: '#636366', highlight: '#48484A' }, // Space Gray
  ]
  const c = palette[Math.abs(seed) % palette.length]

  return (
    <Box
      sx={{
        width: 38,
        height: 60,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.6))',
      }}
    >
      {/* Vehicle Shadow on Asphalt */}
      <Box
        sx={{
          position: 'absolute',
          width: 42,
          height: 64,
          borderRadius: 2,
          bgcolor: 'rgba(0,0,0,0.45)',
          filter: 'blur(3px)',
          transform: 'translateY(2px)',
        }}
      />

      {/* Main Car Body */}
      <Box
        sx={{
          width: 36,
          height: 56,
          borderRadius: '7px 7px 5px 5px',
          bgcolor: c.body,
          border: `1px solid ${c.highlight}`,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Headlights */}
        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', px: 0.5, pt: 0.5 }}>
          <Box sx={{ width: 5, height: 2, bgcolor: '#FFFDE7', borderRadius: '1px' }} />
          <Box sx={{ width: 5, height: 2, bgcolor: '#FFFDE7', borderRadius: '1px' }} />
        </Box>

        {/* Front Windshield */}
        <Box
          sx={{
            width: 26,
            height: 9,
            borderRadius: '4px 4px 1px 1px',
            bgcolor: c.glass,
            mt: 0.5,
          }}
        />

        {/* Car Roof */}
        <Box
          sx={{
            width: 24,
            height: 18,
            borderRadius: 1,
            bgcolor: c.roof,
            mt: 0.25,
            border: `0.5px solid ${c.highlight}`,
          }}
        />

        {/* Rear Windshield */}
        <Box
          sx={{
            width: 24,
            height: 7,
            borderRadius: '1px 1px 3px 3px',
            bgcolor: c.glass,
            mt: 0.25,
          }}
        />

        {/* Taillights */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 1,
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            px: 0.5,
          }}
        >
          <Box sx={{ width: 6, height: 2, bgcolor: '#D70015', borderRadius: '1px' }} />
          <Box sx={{ width: 6, height: 2, bgcolor: '#D70015', borderRadius: '1px' }} />
        </Box>
      </Box>
    </Box>
  )
}

export default function ParkingLot3DViewer({
  spaces,
  selectedSpaceId,
  onSelectSpace,
  onConfirm,
  isLoading,
  zoneName = 'Main Lot',
}: ParkingLot3DViewerProps) {
  const theme = useTheme()
  const statusTheme = theme.palette.mode === 'dark' ? STATUS.dark : STATUS.light

  const [perspective, setPerspective] = useState<ViewPerspective>('isometric')
  const [zoom, setZoom] = useState<number>(1)
  const [filter, setFilter] = useState<'ALL' | 'AVAILABLE'>('ALL')

  const availableCount = spaces.filter((s) => s.status === 'AVAILABLE').length
  const occupiedCount = spaces.filter((s) => s.status === 'OCCUPIED').length
  const reservedCount = spaces.filter((s) => s.status === 'RESERVED').length

  const filteredSpaces = useMemo(() => {
    if (filter === 'AVAILABLE') {
      return spaces.filter((s) => s.status === 'AVAILABLE')
    }
    return spaces
  }, [spaces, filter])

  // Compute transform style for camera perspective
  const perspectiveTransform = useMemo(() => {
    let base = ''
    if (perspective === 'isometric') {
      base = 'perspective(900px) rotateX(28deg) rotateZ(-5deg) scale(' + zoom + ')'
    } else if (perspective === 'driver') {
      base = 'perspective(650px) rotateX(42deg) scale(' + zoom + ')'
    } else {
      base = 'scale(' + zoom + ')'
    }
    return base
  }, [perspective, zoom])

  if (isLoading) {
    return (
      <Paper
        sx={{
          p: 6,
          textAlign: 'center',
          borderRadius: 3,
          bgcolor: 'background.paper',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Loading 3D parking layout…
        </Typography>
      </Paper>
    )
  }

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Top Controls Toolbar */}
      <Box
        sx={{
          p: { xs: 2, sm: 2.5 },
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: 1.5,
        }}
      >
        {/* Left: Zone Info & Status Counts */}
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h6" fontWeight={700}>
              Parking spots 3D map
            </Typography>
            <Chip
              size="small"
              label={zoneName}
              variant="outlined"
              sx={{ fontWeight: 600, fontSize: 11 }}
            />
          </Stack>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 0.75 }}>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: statusTheme.free,
                  boxShadow: `0 0 8px ${statusTheme.free}`,
                }}
              />
              <Typography variant="caption" fontWeight={600}>
                {availableCount} Available
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: statusTheme.occupied }} />
              <Typography variant="caption" fontWeight={600}>
                {occupiedCount} Occupied
              </Typography>
            </Stack>
            {reservedCount > 0 && (
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: statusTheme.reserved }} />
                <Typography variant="caption" fontWeight={600}>
                  {reservedCount} Reserved
                </Typography>
              </Stack>
            )}
          </Stack>
        </Box>

        {/* Right: Controls & Presets */}
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
          {/* Quick Filters */}
          <ButtonGroup size="small" variant="outlined">
            <Button
              variant={filter === 'ALL' ? 'contained' : 'outlined'}
              onClick={() => setFilter('ALL')}
            >
              All ({spaces.length})
            </Button>
            <Button
              variant={filter === 'AVAILABLE' ? 'contained' : 'outlined'}
              onClick={() => setFilter('AVAILABLE')}
            >
              Free ({availableCount})
            </Button>
          </ButtonGroup>

          {/* Camera Angles */}
          <ButtonGroup size="small">
            <Button
              variant={perspective === 'isometric' ? 'contained' : 'outlined'}
              startIcon={<ViewInArRoundedIcon />}
              onClick={() => setPerspective('isometric')}
            >
              3D Iso
            </Button>
            <Button
              variant={perspective === 'topdown' ? 'contained' : 'outlined'}
              startIcon={<MapRoundedIcon />}
              onClick={() => setPerspective('topdown')}
            >
              2D CAD
            </Button>
          </ButtonGroup>

          {/* Zoom Buttons */}
          <Stack direction="row" spacing={0.5} alignItems="center">
            <IconButton
              size="small"
              onClick={() => setZoom((z) => Math.min(1.4, Number((z + 0.15).toFixed(2))))}
              title="Zoom In"
            >
              <ZoomInRoundedIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => setZoom((z) => Math.max(0.75, Number((z - 0.15).toFixed(2))))}
              title="Zoom Out"
            >
              <ZoomOutRoundedIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => setZoom(1)}
              title="Reset Zoom"
            >
              <RestartAltRoundedIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
      </Box>

      {/* 3D Asphalt Arena Canvas */}
      <Box
        sx={{
          bgcolor: (t) => (t.palette.mode === 'dark' ? '#111214' : '#1A1C20'),
          minHeight: 380,
          p: { xs: 2, sm: 4 },
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundImage:
            'radial-gradient(circle at 50% 30%, rgba(255, 255, 255, 0.05) 0%, transparent 70%)',
        }}
      >
        {/* Drive Aisle Lane with Flow Markings */}
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            transform: 'translateY(-50%)',
            height: 52,
            bgcolor: 'rgba(0, 0, 0, 0.45)',
            borderTop: '1px dashed rgba(255, 255, 255, 0.25)',
            borderBottom: '1px dashed rgba(255, 255, 255, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: 'rgba(255, 255, 255, 0.45)',
              fontWeight: 800,
              letterSpacing: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <span>◄</span>
            <span>ENTRY · DRIVE AISLE</span>
            <span>◄</span>
          </Typography>
        </Box>

        {/* 3D Spatial Grid Container */}
        <Box
          sx={{
            transform: perspectiveTransform,
            transformOrigin: 'center center',
            transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(86px, 1fr))',
            gap: 2.75,
            width: '100%',
            maxWidth: 820,
            position: 'relative',
            zIndex: 1,
            py: 4,
          }}
        >
          {filteredSpaces.map((space) => {
            const isFree = space.status === 'AVAILABLE'
            const isOccupied = space.status === 'OCCUPIED'
            const isSelected = selectedSpaceId === space.id

            const bgSurface = isFree
              ? 'linear-gradient(180deg, #1A7F37 0%, #15692D 100%)'
              : isOccupied
                ? 'linear-gradient(180deg, #2A2D32 0%, #202226 100%)'
                : 'linear-gradient(180deg, #B25E00 0%, #8C4900 100%)'

            const edgeShadow = isFree
              ? '0 6px 0 #0E471E, 0 10px 16px rgba(0,0,0,0.5)'
              : isOccupied
                ? '0 5px 0 #141518, 0 8px 12px rgba(0,0,0,0.5)'
                : '0 6px 0 #633300, 0 10px 16px rgba(0,0,0,0.5)'

            return (
              <Tooltip
                key={space.id}
                title={
                  <Box sx={{ p: 0.5 }}>
                    <Typography variant="subtitle2" fontWeight={700}>
                      Bay {space.code ?? `S${space.id}`}
                    </Typography>
                    <Typography variant="caption" display="block">
                      {isFree ? '● Available (Click to select)' : `Status: ${space.status}`}
                    </Typography>
                  </Box>
                }
                arrow
              >
                <Box
                  component={motion.div}
                  whileHover={
                    isFree
                      ? {
                          y: -6,
                          transition: { duration: 0.18, ease: 'easeOut' },
                        }
                      : undefined
                  }
                  whileTap={isFree ? { scale: 0.96 } : undefined}
                  onClick={() => {
                    if (isFree) onSelectSpace(space)
                  }}
                  role="button"
                  tabIndex={isFree ? 0 : -1}
                  aria-disabled={!isFree}
                  aria-pressed={isSelected}
                  aria-label={`Bay ${space.code ?? space.id}, ${isFree ? 'available' : space.status.toLowerCase().replace('_', ' ')}`}
                  onKeyDown={(event: React.KeyboardEvent) => {
                    if (isFree && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault()
                      onSelectSpace(space)
                    }
                  }}
                  sx={{
                    height: 116,
                    borderRadius: 2,
                    background: bgSurface,
                    border: isSelected
                      ? '2.5px solid #FFFFFF'
                      : isFree
                        ? '1px solid rgba(255,255,255,0.3)'
                        : '1px solid rgba(255,255,255,0.12)',
                    boxShadow: isSelected
                      ? `0 0 0 2px #FFFFFF, 0 8px 0 #0E471E, 0 12px 22px rgba(26,127,55,0.6)`
                      : edgeShadow,
                    cursor: isFree ? 'pointer' : 'default',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1,
                    position: 'relative',
                    overflow: 'visible',
                  }}
                >
                  {/* Stall header: bay code */}
                  <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                    <Typography
                      variant="subtitle2"
                      fontWeight={800}
                      sx={{
                        color: '#FFFFFF',
                        letterSpacing: 0.5,
                        fontSize: 13,
                      }}
                    >
                      {space.code ?? `S${space.id}`}
                    </Typography>
                  </Stack>

                  {/* Center Content: Either Parked Vehicle or Subtle Open Stall Silhouette */}
                  {isOccupied ? (
                    <ParkedVehicle3D seed={space.id} />
                  ) : (
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        my: 'auto',
                      }}
                    >
                      <DirectionsCarFilledRoundedIcon
                        sx={{
                          fontSize: 20,
                          color: 'rgba(255,255,255,0.25)',
                        }}
                      />
                    </Box>
                  )}

                  {/* Thermoplastic Stall Edge Borders */}
                  <Box
                    sx={{
                      position: 'absolute',
                      left: 3,
                      top: 10,
                      bottom: 10,
                      width: 2,
                      bgcolor: 'rgba(255,255,255,0.3)',
                      borderRadius: 1,
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      right: 3,
                      top: 10,
                      bottom: 10,
                      width: 2,
                      bgcolor: 'rgba(255,255,255,0.3)',
                      borderRadius: 1,
                    }}
                  />
                </Box>
              </Tooltip>
            )
          })}
        </Box>
      </Box>

      {/* Selected Space Bottom Banner */}
      <AnimatePresence>
        {selectedSpaceId != null && (
          <Box
            component={motion.div}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            sx={{
              p: 2,
              bgcolor: 'action.selected',
              borderTop: 1,
              borderColor: 'divider',
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { sm: 'center' },
              gap: 1.5,
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <CheckCircleRoundedIcon color="success" />
              <Box>
                <Typography variant="subtitle2" fontWeight={700}>
                  Selected Bay: {spaces.find((s) => s.id === selectedSpaceId)?.code ?? 'Bay'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Free right now · pick your time on the next step
                </Typography>
              </Box>
            </Stack>

            <Button
              variant="contained"
              size="small"
              onClick={() => {
                const sp = spaces.find((s) => s.id === selectedSpaceId)
                if (sp) (onConfirm ?? onSelectSpace)(sp)
              }}
              sx={{ alignSelf: { xs: 'stretch', sm: 'auto' } }}
            >
              Reserve bay {spaces.find((s) => s.id === selectedSpaceId)?.code ?? ''}
            </Button>
          </Box>
        )}
      </AnimatePresence>
    </Paper>
  )
}
