import { useState } from 'react'
import { Alert } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import PaymentSheet from '../components/PaymentSheet'
import { mySessionsApi, reservationsApi } from '../api/endpoints'
import { apiErrorMessage } from '../api/client'
import { queryKeys } from '../api/queryKeys'
import type { MySession, PaymentMethod } from '../types'

/** Check-in, check-out (then pay if something is due) and payment for the signed-in driver. */
export function useStayActions() {
  const queryClient = useQueryClient()
  const [payFor, setPayFor] = useState<MySession | null>(null)

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all })
    queryClient.invalidateQueries({ queryKey: queryKeys.mySessions.all })
    queryClient.invalidateQueries({ queryKey: queryKeys.places.all })
  }
  const fail = (error: unknown) => Alert.alert('Something went wrong', apiErrorMessage(error))

  const checkIn = useMutation({
    mutationFn: (reservationId: number) => reservationsApi.checkIn(reservationId),
    onSuccess: (reservation) => {
      refresh()
      Alert.alert('Checked in', `You are parked at bay ${reservation.assignedSpaceCode ?? ''}. Enjoy your visit!`)
    },
    onError: fail,
  })

  const checkOut = useMutation({
    mutationFn: (reservationId: number) => reservationsApi.checkOut(reservationId),
    onSuccess: (stay) => {
      refresh()
      if (stay.paymentStatus === 'PENDING') {
        setPayFor(stay)
      } else {
        Alert.alert('Checked out', 'Parking here was complimentary - see you again!')
      }
    },
    onError: fail,
  })

  const pay = useMutation({
    mutationFn: ({ id, method }: { id: number; method: PaymentMethod }) => mySessionsApi.pay(id, method),
    onSuccess: (stay) => {
      refresh()
      setPayFor(null)
      Alert.alert('Payment received', `Reference ${stay.paymentRef}`)
    },
    onError: fail,
  })

  const paymentSheet = (
    <PaymentSheet
      visible={payFor !== null}
      amount={payFor?.amount}
      durationMinutes={payFor?.durationMinutes}
      description={payFor ? `${payFor.siteName ?? 'Parking'} · bay ${payFor.spaceCode ?? '—'}` : undefined}
      loading={pay.isPending}
      onPay={(method) => payFor && pay.mutate({ id: payFor.id, method })}
      onClose={() => setPayFor(null)}
    />
  )

  return { checkIn, checkOut, pay, openPayment: setPayFor, paymentSheet }
}
