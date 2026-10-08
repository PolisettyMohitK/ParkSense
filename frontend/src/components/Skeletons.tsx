import { Box, Card, Grid, Skeleton, Stack } from '@mui/material'

export function PlaceCardSkeleton() {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Skeleton variant="rectangular" height={160} animation="wave" />
      <Box sx={{ p: 2, flexGrow: 1 }}>
        <Stack spacing={1}>
          <Skeleton variant="text" width="60%" height={28} animation="wave" />
          <Skeleton variant="text" width="85%" height={20} animation="wave" />
          <Skeleton variant="text" width="40%" height={18} animation="wave" />
          <Box sx={{ pt: 1, display: 'flex', gap: 1 }}>
            <Skeleton variant="rounded" width={60} height={24} animation="wave" />
            <Skeleton variant="rounded" width={70} height={24} animation="wave" />
          </Box>
        </Stack>
      </Box>
    </Card>
  )
}

export function PlaceDetailSkeleton() {
  return (
    <Box sx={{ width: '100%' }}>
      <Skeleton variant="rounded" width={140} height={36} sx={{ mb: 2 }} animation="wave" />
      <Card sx={{ mb: 3 }}>
        <Skeleton variant="rectangular" height={260} animation="wave" />
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          <Stack spacing={1.5}>
            <Skeleton variant="text" width="50%" height={40} animation="wave" />
            <Skeleton variant="text" width="70%" height={24} animation="wave" />
            <Stack direction="row" spacing={2} sx={{ pt: 1 }}>
              <Skeleton variant="text" width={100} height={20} animation="wave" />
              <Skeleton variant="text" width={80} height={20} animation="wave" />
              <Skeleton variant="text" width={120} height={20} animation="wave" />
            </Stack>
            <Stack direction="row" spacing={1} sx={{ pt: 1 }}>
              <Skeleton variant="rounded" width={80} height={28} animation="wave" />
              <Skeleton variant="rounded" width={90} height={28} animation="wave" />
            </Stack>
          </Stack>
        </Box>
      </Card>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ p: 2.5 }}>
            <Skeleton variant="text" width={140} height={28} sx={{ mb: 2 }} animation="wave" />
            <Stack spacing={1.5}>
              <Skeleton variant="rounded" height={60} animation="wave" />
              <Skeleton variant="rounded" height={60} animation="wave" />
              <Skeleton variant="rounded" height={60} animation="wave" />
            </Stack>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 2.5 }}>
            <Skeleton variant="text" width={160} height={28} sx={{ mb: 2 }} animation="wave" />
            <Stack spacing={1.5}>
              <Skeleton variant="rounded" height={48} animation="wave" />
              <Skeleton variant="rounded" height={48} animation="wave" />
              <Skeleton variant="rounded" height={48} animation="wave" />
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
