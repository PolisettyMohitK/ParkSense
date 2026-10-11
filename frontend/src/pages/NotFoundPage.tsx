import { useNavigate } from 'react-router-dom'
import TravelExploreRoundedIcon from '@mui/icons-material/TravelExploreRounded'
import EmptyState from '../components/EmptyState'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <EmptyState
      icon={<TravelExploreRoundedIcon sx={{ fontSize: 56 }} />}
      title="Page not found"
      subtitle="The page you are looking for does not exist or may have moved."
      action={{ label: 'Go to home', onClick: () => navigate('/') }}
    />
  )
}
