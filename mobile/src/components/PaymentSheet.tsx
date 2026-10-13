import { useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AppButton, Muted, Title } from './ui'
import { makeStyles, useTheme } from '../theme/ThemeProvider'
import { radius, spacing } from '../theme/palette'
import { formatDuration, formatMoney } from '../utils/format'
import type { PaymentMethod } from '../types'

const METHODS: { value: PaymentMethod; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'UPI', label: 'UPI', icon: 'qr-code-outline' },
  { value: 'CARD', label: 'Card', icon: 'card-outline' },
  { value: 'WALLET', label: 'Wallet', icon: 'wallet-outline' },
  { value: 'CASH', label: 'Cash', icon: 'cash-outline' },
]

/**
 * Bottom sheet that settles a completed stay. Simulated: the backend records the method and issues a
 * reference, but no card or account details are ever asked for.
 */
export default function PaymentSheet({
  visible,
  amount,
  description,
  durationMinutes,
  loading,
  onPay,
  onClose,
}: {
  visible: boolean
  amount?: number | null
  description?: string
  durationMinutes?: number | null
  loading?: boolean
  onPay: (method: PaymentMethod) => void
  onClose: () => void
}) {
  const styles = useStyles()
  const { colors } = useTheme()
  const [method, setMethod] = useState<PaymentMethod>('UPI')

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={loading ? undefined : onClose} accessibilityLabel="Close payment" />
      <View style={styles.sheet}>
        <Title size={22}>Pay for parking</Title>
        {description ? <Muted>{description}</Muted> : null}
        <Text style={styles.amount}>{formatMoney(amount)}</Text>
        {durationMinutes != null ? <Muted>Parked for {formatDuration(durationMinutes)}</Muted> : null}
        <View style={styles.methods}>
          {METHODS.map((option) => {
            const selected = method === option.value
            return (
              <Pressable
                key={option.value}
                onPress={() => setMethod(option.value)}
                style={[styles.method, selected && { borderColor: colors.text, backgroundColor: colors.primaryDim }]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
              >
                <Ionicons name={option.icon} size={22} color={colors.text} />
                <Text style={styles.methodLabel}>{option.label}</Text>
              </Pressable>
            )
          })}
        </View>
        <Muted>Demo checkout: no money is charged and no card or bank details are collected.</Muted>
        <AppButton label={loading ? 'Processing…' : `Pay ${formatMoney(amount)}`} onPress={() => onPay(method)} loading={loading} />
        <AppButton label="Later" variant="outline" onPress={onClose} disabled={loading} />
      </View>
    </Modal>
  )
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
    sheet: {
      backgroundColor: colors.surface,
      padding: spacing.xl,
      gap: spacing.md,
      borderTopLeftRadius: radius.panel,
      borderTopRightRadius: radius.panel,
    },
    amount: { fontSize: 40, fontWeight: '800', color: colors.text },
    methods: { flexDirection: 'row', gap: spacing.sm },
    method: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
      paddingVertical: spacing.md,
      borderRadius: radius.control,
      borderWidth: 1,
      borderColor: colors.hairline,
    },
    methodLabel: { color: colors.text, fontWeight: '600', fontSize: 12 },
  }),
)
