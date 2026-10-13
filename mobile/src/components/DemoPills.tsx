import { View, Text, Pressable, StyleSheet } from 'react-native'
import { radius, spacing } from '../theme/palette'
import { useTheme } from '../theme/ThemeProvider'

const ACCOUNTS = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'user', label: 'Driver' },
] as const

export type DemoAccountKey = (typeof ACCOUNTS)[number]['value']

/**
 * Evaluators need a one-click way in, so demo accounts stay — styled as quiet
 * monospace pills that fill the form on tap.
 */
export function DemoPills<T extends string>({
  value,
  onChange,
}: {
  value: T
  onChange: (value: T) => void
}) {
  const { colors } = useTheme()
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
      {ACCOUNTS.map((account) => {
        const active = account.value === value
        return (
          <Pressable
            key={account.value}
            onPress={() => onChange(account.value as T)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[
              styles.pill,
              {
                borderColor: active ? colors.holo : colors.hairlineStrong,
                backgroundColor: active ? colors.holoSoft : 'transparent',
              },
            ]}
          >
            <Text
              style={{
                fontFamily: colors.mono,
                fontSize: 12,
                color: active ? colors.holo : colors.textSecondary,
              }}
            >
              {account.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
})
