import type { ReactNode } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../theme/ThemeProvider'
import { radius, spacing, statusMaps, typography, type Palette } from '../theme/palette'

export function Screen({
  children,
  scroll = true,
  style,
}: {
  children: ReactNode
  scroll?: boolean
  style?: StyleProp<ViewStyle>
}) {
  const { colors } = useTheme()
  const body = (
    <View style={[styles(colors).screenBody, style]}>{children}</View>
  )
  return (
    <SafeAreaView style={[styles(colors).safe]} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles(colors).scroll} keyboardShouldPersistTaps="handled">
          {body}
        </ScrollView>
      ) : (
        body
      )}
    </SafeAreaView>
  )
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme()
  return <View style={[styles(colors).card, style]}>{children}</View>
}

export function ListSection({
  title,
  footer,
  children,
}: {
  title?: string
  footer?: string
  children: ReactNode
}) {
  const { colors } = useTheme()
  return (
    <View style={styles(colors).section}>
      {title ? <Text style={styles(colors).sectionTitle}>{title.toUpperCase()}</Text> : null}
      <View style={styles(colors).sectionCard}>{children}</View>
      {footer ? <Text style={styles(colors).sectionFooter}>{footer}</Text> : null}
    </View>
  )
}

export function ListRow({
  label,
  value,
  hint,
  onPress,
  right,
  destructive = false,
  last = false,
}: {
  label: string
  value?: string
  hint?: string
  onPress?: () => void
  right?: ReactNode
  destructive?: boolean
  last?: boolean
}) {
  const { colors } = useTheme()
  const s = styles(colors)
  const content = (
    <View style={[s.rowInner, !last && s.rowBorder]}>
      <View style={s.rowLabelBlock}>
        <Text style={[s.rowLabel, destructive && { color: colors.danger }]}>{label}</Text>
        {hint ? <Text style={s.rowHint}>{hint}</Text> : null}
      </View>
      {value ? <Text style={s.rowValue}>{value}</Text> : null}
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} /> : null)}
    </View>
  )
  if (!onPress) return content
  return (
    <Pressable onPress={onPress} style={({ pressed }) => (pressed ? { opacity: 0.6 } : undefined)}>
      {content}
    </Pressable>
  )
}

export function Row({
  children,
  style,
  between = false,
}: {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  between?: boolean
}) {
  return <View style={[rawRow, between && rawRowBetween, style]}>{children}</View>
}

export function Title({
  children,
  size = 22,
  style,
}: {
  children: ReactNode
  size?: number
  style?: StyleProp<TextStyle>
}) {
  const { colors } = useTheme()
  return <Text style={[{ color: colors.text, fontWeight: '700', fontSize: size }, style]}>{children}</Text>
}

export function Muted({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const { colors } = useTheme()
  return <Text style={[{ color: colors.textSecondary, fontSize: 13 }, style]}>{children}</Text>
}

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  icon,
  style,
}: {
  label: string
  onPress: () => void
  variant?: 'primary' | 'outline' | 'ghost' | 'danger' | 'success' | 'tinted'
  disabled?: boolean
  loading?: boolean
  icon?: keyof typeof Ionicons.glyphMap
  style?: StyleProp<ViewStyle>
}) {
  const { colors } = useTheme()
  const s = styles(colors)
  const palette = {
    primary: { bg: colors.primary, fg: colors.onPrimary },
    tinted: { bg: colors.primaryDim, fg: colors.text },
    outline: { bg: 'transparent', fg: colors.text },
    ghost: { bg: 'transparent', fg: colors.textSecondary },
    danger: { bg: colors.dangerDim, fg: colors.danger },
    success: { bg: colors.successDim, fg: colors.success },
  }[variant]

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.button,
        { backgroundColor: palette.bg },
        variant === 'outline' && s.buttonOutline,
        (disabled || loading) && s.buttonDisabled,
        pressed && !disabled && { opacity: 0.75 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.fg} />
      ) : (
        <View style={rawRow}>
          {icon ? <Ionicons name={icon} size={17} color={palette.fg} style={{ marginRight: 6 }} /> : null}
          <Text style={[s.buttonLabel, { color: palette.fg }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  )
}

export function AppInput({
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  multiline,
  autoCapitalize,
}: {
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
  secureTextEntry?: boolean
  keyboardType?: 'default' | 'numeric' | 'email-address'
  multiline?: boolean
  autoCapitalize?: 'none' | 'sentences' | 'words'
}) {
  const { colors } = useTheme()
  const s = styles(colors)
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textSecondary}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      multiline={multiline}
      autoCapitalize={autoCapitalize}
      style={[s.input, multiline && s.inputMultiline]}
    />
  )
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search',
}: {
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
}) {
  const { colors } = useTheme()
  const s = styles(colors)
  return (
    <View style={s.search}>
      <Ionicons name="search" size={17} color={colors.textSecondary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        style={s.searchInput}
        autoCapitalize="none"
        returnKeyType="search"
      />
    </View>
  )
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  const { colors } = useTheme()
  const s = styles(colors)
  return (
    <View style={s.segmented}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <Pressable key={option.value} onPress={() => onChange(option.value)} style={s.segment}>
            <View style={[s.segmentInner, selected && s.segmentSelected]}>
              <Text style={[s.segmentLabel, selected && s.segmentLabelSelected]} numberOfLines={1}>
                {option.label}
              </Text>
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}

export function ChipRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  const { colors } = useTheme()
  const s = styles(colors)
  return (
    <View style={s.chipRow}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[s.chip, selected && s.chipSelected]}
          >
            <Text style={[s.chipLabel, selected && s.chipLabelSelected]}>{option.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export function CategoryChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  const { colors } = useTheme()
  const s = styles(colors)
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.categoryRow}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[s.category, selected && s.categorySelected]}
          >
            <Text style={[s.categoryLabel, selected && s.categoryLabelSelected]}>{option.label}</Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

export function Pill({ label, tone }: { label: string; tone?: string }) {
  const { colors } = useTheme()
  const s = styles(colors)
  return (
    <View style={[s.pill, tone ? { backgroundColor: tone } : null]}>
      <Text style={[s.pillLabel, tone ? { color: '#FFFFFF' } : null]}>{label}</Text>
    </View>
  )
}

type BadgeKind = keyof ReturnType<typeof statusMaps>

export function Badge({ kind, value }: { kind: BadgeKind; value: string }) {
  const { colors } = useTheme()
  const maps = statusMaps(colors)
  const config = maps[kind][value] ?? { bg: colors.neutralDim, fg: colors.textSecondary, label: value }
  return (
    <View style={[styles(colors).badge, { backgroundColor: config.bg }]}>
      <Text style={[styles(colors).badgeLabel, { color: config.fg }]}>{config.label}</Text>
    </View>
  )
}

export function EmptyState({
  title,
  subtitle,
  icon = 'file-tray-outline',
  action,
}: {
  title: string
  subtitle?: string
  icon?: keyof typeof Ionicons.glyphMap
  action?: { label: string; onPress: () => void }
}) {
  const { colors } = useTheme()
  const s = styles(colors)
  return (
    <View style={s.empty}>
      <Ionicons name={icon} size={40} color={colors.textSecondary} />
      <Text style={s.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={s.emptySubtitle}>{subtitle}</Text> : null}
      {action ? (
        <View style={{ marginTop: 12 }}>
          <AppButton label={action.label} onPress={action.onPress} variant="outline" />
        </View>
      ) : null}
    </View>
  )
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  const { colors } = useTheme()
  return (
    <View style={styles(colors).empty}>
      <ActivityIndicator color={colors.text} />
      <Text style={[styles(colors).emptySubtitle, { marginTop: spacing.md }]}>{label}</Text>
    </View>
  )
}

export function Divider() {
  const { colors } = useTheme()
  return <View style={styles(colors).divider} />
}

const rawRow: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }
const rawRowBetween: ViewStyle = { justifyContent: 'space-between' }

const styles = (c: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.groupedBackground },
    scroll: { paddingBottom: spacing.xxl },
    screenBody: { padding: spacing.lg, gap: spacing.md },
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.card,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    section: { gap: spacing.sm },
    sectionTitle: {
      color: c.textSecondary,
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 0.6,
      paddingHorizontal: spacing.xs,
    },
    sectionCard: { backgroundColor: c.surface, borderRadius: radius.card, overflow: 'hidden' },
    sectionFooter: { color: c.textSecondary, fontSize: 12, paddingHorizontal: spacing.xs },
    rowInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: 13,
      minHeight: 48,
    },
    rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.separator },
    rowLabelBlock: { flex: 1, gap: 2 },
    rowLabel: { color: c.text, fontSize: typography.body.fontSize },
    rowHint: { color: c.textSecondary, fontSize: typography.caption.fontSize },
    rowValue: { color: c.textSecondary, fontSize: typography.subhead.fontSize },
    button: {
      paddingVertical: 13,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonOutline: { borderWidth: StyleSheet.hairlineWidth, borderColor: c.separator },
    buttonDisabled: { opacity: 0.4 },
    buttonLabel: { fontWeight: '600', fontSize: 16 },
    input: {
      backgroundColor: c.fill,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      color: c.text,
      fontSize: typography.body.fontSize,
    },
    inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
    search: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: c.fill,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 9,
    },
    searchInput: { flex: 1, color: c.text, fontSize: typography.body.fontSize, paddingVertical: 3 },
    segmented: {
      flexDirection: 'row',
      backgroundColor: c.fill,
      borderRadius: 10,
      padding: 2,
      gap: 2,
    },
    segment: { flex: 1 },
    segmentInner: { paddingVertical: 7, borderRadius: 8, alignItems: 'center' },
    segmentSelected: { backgroundColor: c.surface },
    segmentLabel: { color: c.textSecondary, fontSize: 13, fontWeight: '600' },
    segmentLabelSelected: { color: c.text },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderRadius: radius.pill,
      backgroundColor: c.fill,
    },
    chipSelected: { backgroundColor: c.primary },
    chipLabel: { color: c.text, fontSize: 13, fontWeight: '600' },
    chipLabelSelected: { color: c.onPrimary },
    categoryRow: { gap: spacing.sm, paddingVertical: 2 },
    category: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: radius.pill,
      backgroundColor: c.fill,
    },
    categorySelected: { backgroundColor: c.primary },
    categoryLabel: { color: c.text, fontSize: 14, fontWeight: '600' },
    categoryLabelSelected: { color: c.onPrimary },
    pill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radius.pill,
      backgroundColor: c.fill,
    },
    pillLabel: { fontSize: 12, fontWeight: '700', color: c.text },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, alignSelf: 'flex-start' },
    badgeLabel: { fontSize: 12, fontWeight: '700' },
    empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
    emptyTitle: { color: c.text, fontSize: 16, fontWeight: '600' },
    emptySubtitle: { color: c.textSecondary, fontSize: 13, textAlign: 'center', maxWidth: 300 },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: c.separator, marginVertical: spacing.sm },
  })
