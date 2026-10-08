import type { NavigatorScreenParams } from '@react-navigation/native'
import type { Vehicle } from '../types'

export type TabParamList = {
  Explore: undefined
  Home: undefined
  Bookings: undefined
  Zones: undefined
  Map: undefined
  Camera: undefined
  Profile: undefined
}

export type RootStackParamList = {
  Login: undefined
  Tabs: NavigatorScreenParams<TabParamList> | undefined
  PlaceDetail: { siteId: number }
  ZoneDetail: { zoneId: number; zoneName: string }
  Zones: undefined
  Map: undefined
  NewReservation: { siteId?: number; zoneId?: number; spaceId?: number } | undefined
  Reservations: undefined
  Bookings: { tab?: string } | undefined
  Sessions: undefined
  Vehicles: undefined
  VehicleForm: { vehicle?: Vehicle } | undefined
  Settings: undefined
  AdminUsers: undefined
  AdminOrganizations: undefined
  AdminSites: undefined
  AdminDevices: undefined
}
