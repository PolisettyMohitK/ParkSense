import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  RefreshControl,
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
import Svg, { Circle, Path } from 'react-native-svg'
import { useTheme } from '../theme/ThemeProvider'
import {
  radius,
  spacing,
  statusMaps,
  typography,
  type BadgeKind,
} from '../theme/palette'

export type { BadgeKind }

/* -------------------------------------------------------------------------- *
 * Screen
 * -------------------------------------------------------------------------- */

export function Screen({
  children,
  scroll = true,
  style,
  onRefresh,
  refreshing = false,
  floatingTabs = false,
}: {
  children: ReactNode
  scroll?: boolean
  style?: StyleProp<ViewStyle>
  onRefresh?: () => void
  refreshing?: boolean
  /** Adds bottom padding so a floating tab bar never covers content. */
  floatingTabs?: boolean
}) {
  const { colors } = useTheme()
  const body = <View style={[styles.screenBody, style]}>{children}</View>
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            floatingTabs ? { paddingBottom: 108 } : null,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.holo} />
            ) : undefined
          }
        >
          {body}
        </ScrollView>
      ) : (
        body
      )}
    </SafeAreaView>
  )
}

/* -------------------------------------------------------------------------- *
 * Panels — hairline over box
 * -------------------------------------------------------------------------- */

/** Standard surface: one hairline, no shadow in dark, one soft level in light. */
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme()
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius.panel,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.hairline,
          padding: spacing.lg,
          gap: spacing.sm,
        },
        colors.elevationShadow ? { shadowColor: '#0B1220', shadowOpacity: 1, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 3 } : colors.elevationInner ? { shadowColor: '#FFFFFF', shadowOpacity: 1, shadowRadius: 1, shadowOffset: { width: 0, height: -1 }, elevation: 0 } : null,
        style,
      ]}
    >
      {children}
    </View>
  )
}

/**
 * HUD panel: the 8 px 45-degree chamfer plus four corner ticks. Reserved for
 * the active instrument surface — the active stay, the lot, the payment total.
 */
export function HudPanel({
  children,
  style,
  ticks = true,
}: {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  ticks?: boolean
}) {
  const { colors } = useTheme()
  return (
    <View style={[{ position: 'relative' }, style]}>
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius.panel,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.hairlineStrong,
          padding: spacing.lg,
        }}
      >
        {children}
      </View>
      {ticks ? <CornerTicks color={colors.holo} /> : null}
    </View>
  )
}

const TICK = 8

/** Four L-shaped hairline ticks instead of a full border. */
export function CornerTicks({ color, inset = -1, length = 10 }: { color: string; inset?: number; length?: number }) {
  const positions: ViewStyle[] = [
    { top: inset, left: inset, borderTopWidth: 1, borderLeftWidth: 1 },
    { top: inset, right: inset, borderTopWidth: 1, borderRightWidth: 1 },
    { bottom: inset, left: inset, borderBottomWidth: 1, borderLeftWidth: 1 },
    { bottom: inset, right: inset, borderBottomWidth: 1, borderRightWidth: 1 },
  ]
  return (
    <>
      {positions.map((position, index) => (
        <View
          key={index}
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: length,
            height: length,
            borderColor: color,
            ...position,
          }}
        />
      ))}
    </>
  )
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
    <View style={{ gap: spacing.sm }}>
      {title ? <SectionLabel>{title}</SectionLabel> : null}
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius.panel,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.hairline,
          overflow: 'hidden',
        }}
      >
        {children}
      </View>
      {footer ? <Text style={styles.sectionFooter}>{footer}</Text> : null}
    </View>
  )
}

/** Overline section label. Separates regions without drawing a box. */
export function SectionLabel({ children }: { children: ReactNode }) {
  const { colors } = useTheme()
  return (
    <Text
      style={{
        ...typography.overline,
        textTransform: 'uppercase',
        color: colors.textSecondary,
        paddingHorizontal: spacing.xs,
      }}
    >
      {children}
    </Text>
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
  const content = (
    <View style={[styles.rowInner, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.hairline }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: destructive ? colors.danger : colors.text, fontSize: 15 }}>{label}</Text>
        {hint ? <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{hint}</Text> : null}
      </View>
      {value ? (
        <Text style={{ color: colors.textSecondary, fontSize: 15 }}>{value}</Text>
      ) : null}
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} /> : null)}
    </View>
  )
  if (!onPress) return content
  return (
    <Pressable onPress={onPress} style={({ pressed }) => (pressed ? { backgroundColor: colors.actionHover } : undefined)}>
      {content}
    </Pressable>
  )
}

/** One thin timeline row with a rail down its left edge. */
export function TimelineRow({
  children,
  isNow = false,
  last = false,
}: {
  children: ReactNode
  isNow?: boolean
  last?: boolean
}) {
  const { colors } = useTheme()
  return (
    <View style={{ flexDirection: 'row' }}>
      <View style={{ width: 18, alignItems: 'center' }}>
        <View
          style={{
            width: isNow ? 10 : 6,
            height: isNow ? 10 : 6,
            borderRadius: 5,
            marginTop: 18,
            backgroundColor: isNow ? colors.holo : colors.hairlineStrong,
            borderWidth: isNow ? 2 : 1,
            borderColor: isNow ? colors.background : 'transparent',
          }}
        />
        {!last ? (
          <View style={{ flex: 1, width: 1, backgroundColor: colors.hairline }} />
        ) : null}
      </View>
      <View style={{ flex: 1, paddingBottom: last ? 0 : spacing.sm }}>{children}</View>
    </View>
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
  return <View style={[styles.row, between && { justifyContent: 'space-between' }, style]}>{children}</View>
}

export function Title({
  children,
  style,
}: {
  children: ReactNode
  size?: number
  style?: StyleProp<TextStyle>
}) {
  const { colors } = useTheme()
  return (
    <Text
      style={[{ color: colors.text, fontWeight: '600', fontSize: 28, lineHeight: 32, letterSpacing: -0.4 }, style]}
    >
      {children}
    </Text>
  )
}

export function Muted({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const { colors } = useTheme()
  return (
    <Text style={[{ color: colors.textSecondary, fontSize: 15, lineHeight: 22 }, style]}>{children}</Text>
  )
}

/* -------------------------------------------------------------------------- *
 * Instrument readouts
 * -------------------------------------------------------------------------- */

/**
 * Every count, price, percentage and duration. Monospace, tabular, and it
 * animates old → new in 300 ms so a change is impossible to miss.
 */
export function NumericReadout({
  value,
  prefix,
  suffix,
  decimals = 0,
  size = 26,
  color,
  align = 'left',
}: {
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
  size?: number
  color?: string
  align?: 'left' | 'center' | 'right'
}) {
  const { colors } = useTheme()
  const { reducedMotion } = useTheme()
  const display = useTickUp(value, reducedMotion ? 0 : 300)
  return (
    <Text
      accessibilityLabel={`${prefix ?? ''}${display.toFixed(decimals)}${suffix ?? ''}`}
      style={{
        fontFamily: colors.mono,
        fontSize: size,
        lineHeight: size * 1.18,
        fontWeight: '600',
        letterSpacing: -0.3,
        color: color ?? colors.text,
        textAlign: align,
        fontVariant: ['tabular-nums'],
      }}
    >
      {prefix}
      {display.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </Text>
  )
}

function useTickUp(target: number, duration: number): number {
  const [display, setDisplay] = useState(target)
  const fromRef = useRef(target)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    if (duration <= 0 || fromRef.current === target) {
      fromRef.current = target
      setDisplay(target)
      return
    }
    const from = fromRef.current
    const start = Date.now()
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(from + (target - from) * eased)
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = target
      }
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      fromRef.current = target
    }
  }, [target, duration])

  return display
}

/** Monospace body text for codes, plates and timestamps. */
export function Mono({
  children,
  style,
  size = 12,
  color,
}: {
  children: ReactNode
  style?: StyleProp<TextStyle>
  size?: number
  color?: string
}) {
  const { colors } = useTheme()
  return (
    <Text
      style={[
        { fontFamily: colors.mono, fontSize: size, color: color ?? colors.textSecondary, fontVariant: ['tabular-nums'] },
        style,
      ]}
    >
      {children}
    </Text>
  )
}

/** 6 px holo dot with a slow pulse. Only for genuinely real-time things. */
export function LiveDot({ live = true, size = 6, color }: { live?: boolean; size?: number; color?: string }) {
  const { colors, reducedMotion } = useTheme()
  const pulse = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (!live || reducedMotion) {
      pulse.setValue(1)
      return
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.45, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [live, reducedMotion, pulse])

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color ?? (live ? colors.holo : colors.textTertiary),
        opacity: live ? pulse : 1,
      }}
    />
  )
}

/** Live dot + monospace label. */
export function LiveBadge({ live, label }: { live: boolean; label?: string }) {
  const { colors } = useTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <LiveDot live={live} />
      <Text style={{ fontFamily: colors.mono, fontSize: 11, letterSpacing: 1, color: colors.textSecondary }}>
        {(label ?? (live ? 'LIVE' : 'OFFLINE')).toUpperCase()}
      </Text>
    </View>
  )
}

/* -------------------------------------------------------------------------- *
 * Buttons & inputs
 * -------------------------------------------------------------------------- */

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
  const scale = useRef(new Animated.Value(1)).current

  const palette = {
    primary: { bg: colors.primary, fg: colors.onPrimary, border: 'transparent' },
    tinted: { bg: colors.primaryDim, fg: colors.text, border: 'transparent' },
    outline: { bg: 'transparent', fg: colors.text, border: colors.controlBorder },
    ghost: { bg: 'transparent', fg: colors.textSecondary, border: 'transparent' },
    danger: { bg: colors.dangerDim, fg: colors.danger, border: 'transparent' },
    success: { bg: colors.successDim, fg: colors.success, border: 'transparent' },
  }[variant]

  const to = (value: number) =>
    Animated.spring(scale, { toValue: value, useNativeDriver: true, speed: 40, bounciness: 0 }).start()

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => to(0.98)}
        onPressOut={() => to(1)}
        disabled={disabled || loading}
        accessibilityRole="button"
        accessibilityState={{ disabled: disabled || loading, busy: loading }}
        accessibilityLabel={label}
        style={{
          paddingVertical: 13,
          paddingHorizontal: spacing.lg,
          borderRadius: radius.control,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 6,
          backgroundColor: palette.bg,
          borderWidth: palette.border === 'transparent' ? 0 : StyleSheet.hairlineWidth,
          borderColor: palette.border,
          opacity: disabled || loading ? 0.45 : 1,
          minHeight: 44,
        }}
      >
        {loading ? (
          <ActivityIndicator size="small" color={palette.fg} />
        ) : (
          <>
            {icon ? <Ionicons name={icon} size={16} color={palette.fg} /> : null}
            <Text style={{ fontWeight: '600', fontSize: 15, color: palette.fg }}>{label}</Text>
          </>
        )}
      </Pressable>
    </Animated.View>
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
  autoFocus,
}: {
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
  secureTextEntry?: boolean
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad'
  multiline?: boolean
  autoCapitalize?: 'none' | 'sentences' | 'words'
  autoFocus?: boolean
}) {
  const { colors } = useTheme()
  const [focused, setFocused] = useState(false)
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textTertiary}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      multiline={multiline}
      autoCapitalize={autoCapitalize}
      autoFocus={autoFocus}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      accessibilityLabel={placeholder}
      style={[
        {
          backgroundColor: colors.surfaceRaised,
          borderRadius: radius.control,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: focused ? colors.holo : colors.hairlineStrong,
          paddingHorizontal: spacing.md,
          paddingVertical: 12,
          color: colors.text,
          fontSize: 15,
          minHeight: multiline ? 88 : 44,
          textAlignVertical: multiline ? 'top' : 'center',
        },
      ]}
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
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.surface,
        borderRadius: radius.control,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.hairlineStrong,
        paddingHorizontal: spacing.md,
        minHeight: 48,
      }}
    >
      <Ionicons name="search" size={17} color={colors.textSecondary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        accessibilityLabel={placeholder}
        returnKeyType="search"
        autoCapitalize="none"
        style={{ flex: 1, color: colors.text, fontSize: 16, paddingVertical: 10 }}
      />
    </View>
  )
}

/* -------------------------------------------------------------------------- *
 * Selection controls
 * -------------------------------------------------------------------------- */

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
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.fill,
        borderRadius: radius.control,
        padding: 2,
        gap: 2,
      }}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={{ flex: 1 }}
          >
            <View
              style={{
                paddingVertical: 8,
                paddingHorizontal: 4,
                borderRadius: radius.chip,
                alignItems: 'center',
                backgroundColor: selected ? colors.surfaceRaised : 'transparent',
              }}
            >
              <Text
                numberOfLines={1}
                style={{ color: selected ? colors.text : colors.textSecondary, fontSize: 13, fontWeight: '600' }}
              >
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
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {options.map((option) => (
        <Chip
          key={option.value}
          label={option.label}
          active={option.value === value}
          onPress={() => onChange(option.value)}
        />
      ))}
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
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing.sm, paddingVertical: 2 }}
    >
      {options.map((option) => (
        <Chip
          key={option.value}
          label={option.label}
          active={option.value === value}
          onPress={() => onChange(option.value)}
        />
      ))}
    </ScrollView>
  )
}

/** Quiet filter chip: hairline outline, holo fill when active. */
export function Chip({
  label,
  active = false,
  onPress,
  icon,
}: {
  label: string
  active?: boolean
  onPress?: () => void
  icon?: keyof typeof Ionicons.glyphMap
}) {
  const { colors } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: active ? colors.holo : colors.hairline,
        backgroundColor: active ? colors.holoSoft : 'transparent',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {icon ? <Ionicons name={icon} size={13} color={active ? colors.holo : colors.textSecondary} /> : null}
      <Text
        style={{
          fontSize: 13,
          fontWeight: active ? '600' : '400',
          color: active ? colors.holo : colors.textSecondary,
        }}
      >
        {label}
      </Text>
    </Pressable>
  )
}

export function Pill({ label, tone }: { label: string; tone?: string }) {
  const { colors } = useTheme()
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: radius.pill,
        backgroundColor: tone ?? colors.fill,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '600', color: tone ? colors.onPrimary : colors.text }}>{label}</Text>
    </View>
  )
}

/** Status badge: dim tint + glyph + label, never colour alone. */
export function Badge({ kind, value }: { kind: BadgeKind; value: string }) {
  const { colors } = useTheme()
  const maps = statusMaps(colors)
  const config = maps[kind][value] ?? { bg: colors.neutralDim, fg: colors.textSecondary, label: value, key: null }
  return (
    <View
      accessible
      accessibilityLabel={config.label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: radius.chip,
        alignSelf: 'flex-start',
        backgroundColor: config.bg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: config.fg,
      }}
    >
      {config.key ? (
        <Text style={{ fontFamily: colors.mono, fontSize: 9, color: config.fg }}>{STATUS_GLYPH[config.key]}</Text>
      ) : null}
      <Text style={{ fontSize: 12, fontWeight: '600', color: config.fg }}>{config.label}</Text>
    </View>
  )
}

const STATUS_GLYPH: Record<string, string> = {
  free: '○',
  occupied: '●',
  reserved: '◑',
  offline: '—',
  proposed: '◇',
}

/* -------------------------------------------------------------------------- *
 * States
 * -------------------------------------------------------------------------- */

/** Empty state: one line, one action, and a wireframe mark from the 3D style. */
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
  return (
    <View style={styles.empty}>
      <WireframeMark size={96} />
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{title}</Text>
      {subtitle ? (
        <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center', maxWidth: 300 }}>{subtitle}</Text>
      ) : null}
      {action ? <AppButton label={action.label} onPress={action.onPress} variant="outline" /> : null}
      <Text style={{ color: colors.textTertiary, fontSize: 11 }}>{icon}</Text>
    </View>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <EmptyState
      icon="cloud-offline-outline"
      title="Something went wrong"
      subtitle={message}
      action={onRetry ? { label: 'Try again', onPress: onRetry } : undefined}
    />
  )
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  const { colors } = useTheme()
  return (
    <View style={styles.empty}>
      <ActivityIndicator color={colors.holo} />
      <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: spacing.md }}>{label}</Text>
    </View>
  )
}

export function Divider() {
  const { colors } = useTheme()
  return (
    <View
      style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.hairline, marginVertical: spacing.sm }}
    />
  )

}

/**
 * Skeleton block. Reserved-height shimmer — never a spinner for content.
 * Spinners only appear inside buttons.
 */
export function Skeleton({
  width = '100%',
  height = 14,
  radius: r = radius.chip,
  style,
}: {
  width?: number | string
  height?: number
  radius?: number
  style?: StyleProp<ViewStyle>
}) {
  const { colors, reducedMotion } = useTheme()
  const shift = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (reducedMotion) return
    const loop = Animated.loop(
      Animated.timing(shift, {
        toValue: 1,
        duration: 1400,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    )
    loop.start()
    return () => loop.stop()
  }, [shift, reducedMotion])

  return (
    <View
      style={[
        { width: width as ViewStyle['width'], height, borderRadius: r, backgroundColor: colors.hairline, overflow: 'hidden' },
        style,
      ]}
    >
      {!reducedMotion ? (
        <Animated.View
          style={{
            width: '60%',
            height: '100%',
            backgroundColor: colors.holoSoft,
            transform: [
              {
                translateX: shift.interpolate({ inputRange: [0, 1], outputRange: [-220, 420] }),
              },
            ],
          }}
        />
      ) : null}
    </View>
  )
}

/* -------------------------------------------------------------------------- *
 * Wireframe mark
 * -------------------------------------------------------------------------- */

/**
 * A miniature isometric lot drawn from the same primitives as HoloLot, so an
 * empty state looks like an empty lot rather than a missing component.
 */
export function WireframeMark({ size = 96, color }: { size?: number; color?: string }) {
  const { colors } = useTheme()
  const stroke = color ?? colors.holo
  return (
    <Svg width={size} height={size * 0.68} viewBox="0 0 140 96" fill="none">
      <Path d="M18 60 L70 30 L122 60 L70 90 Z" stroke={colors.hairlineStrong} strokeWidth={1} />
      <Path d="M18 60 L70 30 L122 60" stroke={stroke} strokeWidth={1.2} strokeOpacity={0.55} />
      <Path d="M33 54 L56 41 L56 55 L33 68 Z" stroke={stroke} strokeWidth={1.1} />
      <Path d="M84 78 L107 65 L107 79 L84 92 Z" stroke={stroke} strokeWidth={1.1} />
      <Path d="M56 66 L79 53 L79 67 L56 80 Z" stroke={stroke} strokeWidth={1.1} strokeOpacity={0.4} strokeDasharray="3 3" />
      <Path d="M18 60 L70 90 L122 60" stroke={colors.hairlineStrong} strokeWidth={1} strokeDasharray="2 4" />
      <Circle cx={70} cy={24} r={2} fill={stroke} fillOpacity={0.7} />
    </Svg>
  )
}

/** Tiny status swatch used by legends and readouts. */
export function StatusSwatch({ color, dim }: { color: string; dim?: string }) {
  return (
    <View
      style={{
        width: 12,
        height: 12,
        borderRadius: 3,
        borderWidth: 1.5,
        borderColor: color,
        backgroundColor: dim ?? 'transparent',
      }}
    />
  )
}

/** Horizontal rule used to separate quiet list rows. */
export function Hairline({ inset = 0 }: { inset?: number }) {
  const { colors } = useTheme()
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.hairline, marginLeft: inset }} />
}

/** Reserved-height placeholder for the lot view. */
export function LotSkeleton({ height = 320 }: { height?: number }) {
  const { colors } = useTheme()
  return (
    <View
      style={{
        height,
        borderRadius: radius.panel,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.hairline,
        overflow: 'hidden',
        backgroundColor: colors.background,
      }}
    >
      <Skeleton width="100%" height={height} radius={radius.panel} />
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: spacing.xxl },
  screenBody: { padding: spacing.lg, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    minHeight: 52,
  },
  sectionFooter: { color: 'rgba(107,118,124,1)', fontSize: 12, paddingHorizontal: spacing.xs },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
})
