import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSnackbar } from 'notistack'
import PaymentDialog from '../components/PaymentDialog'
import { reservationsApi } from '../api/reservations'
import { mySessionsApi } from '../api/sessions'
import { apiErrorMessage } from '../api/client'
import { queryKeys } from '../api/queryKeys'
import type { MySession } from '../types'

/**
 * Driver-side stay actions shared by the bookings page, the active-stay card and the profile:
 * check in, check out (then prompt to pay if something is due) and pay.
 */
export function useStayActions() {
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const [payFor, setPayFor] = useState<MySession | null>(null)

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all })
    queryClient.invalidateQueries({ queryKey: queryKeys.mySessions.all })
    queryClient.invalidateQueries({ queryKey: queryKeys.places.all })
  }

  const checkIn = useMutation({
    mutationFn: (reservationId: number) => reservationsApi.checkIn(reservationId),
    onSuccess: (reservation) => {
      refresh()
      enqueueSnackbar(`Checked in at bay ${reservation.assignedSpaceCode ?? ''}. Enjoy your visit!`, {
        variant: 'success',
      })
    },
    onError: (error) => enqueueSnackbar(apiErrorMessage(error), { variant: 'error' }),
  })

  const checkOut = useMutation({
    mutationFn: (reservationId: number) => reservationsApi.checkOut(reservationId),
    onSuccess: (stay) => {
      refresh()
      if (stay.paymentStatus === 'PENDING') {
        setPayFor(stay)
      } else {
        enqueueSnackbar('Checked out. Parking here was complimentary - see you again!', { variant: 'success' })
      }
    },
    onError: (error) => enqueueSnackbar(apiErrorMessage(error), { variant: 'error' }),
  })

  const pay = useMutation({
    mutationFn: ({ id, method }: { id: number; method: Parameters<typeof mySessionsApi.pay>[1] }) =>
      mySessionsApi.pay(id, method),
    onSuccess: (stay) => {
      refresh()
      setPayFor(null)
      enqueueSnackbar(`Payment received · ${stay.paymentRef}`, { variant: 'success' })
    },
    onError: (error) => enqueueSnackbar(apiErrorMessage(error), { variant: 'error' }),
  })

  const paymentDialog = (
    <PaymentDialog
      open={payFor !== null}
      amount={payFor?.amount}
      currency={payFor?.currency}
      durationMinutes={payFor?.durationMinutes}
      description={payFor ? `${payFor.siteName ?? 'Parking'} · bay ${payFor.spaceCode ?? '—'}` : undefined}
      loading={pay.isPending}
      onPay={(method) => payFor && pay.mutate({ id: payFor.id, method })}
      onClose={() => setPayFor(null)}
    />
  )

  return { checkIn, checkOut, pay, openPayment: setPayFor, paymentDialog }
}
