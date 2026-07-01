import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { colors, radius, spacing } from '@/lib/theme';

interface Props {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: ViewStyle;
}

export const PrimaryButton: React.FC<Props> = ({
  title, onPress, loading, disabled, variant = 'primary', style,
}) => {
  const bg = variant === 'primary' ? colors.brand
    : variant === 'danger' ? colors.danger
    : colors.surface;
  const fg = variant === 'secondary' ? colors.primary : '#fff';
  const isDisabled = !!(loading || disabled);

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.btn,
        variant === 'primary' && styles.primaryShadow,
        variant === 'secondary' && styles.secondary,
        {
          backgroundColor: bg,
          opacity: isDisabled ? 0.55 : 1,
          transform: [{ scale: pressed && !isDisabled ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator color={fg} />
        : <Text style={[styles.text, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  btn: {
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  secondary: {
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  primaryShadow: {
    shadowColor: colors.brandDark,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  text: { fontSize: 16, fontWeight: '700' },
});
