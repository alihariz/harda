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
  const bg = variant === 'primary'   ? colors.primaryAccent
           : variant === 'danger'    ? colors.danger
           : colors.surfaceAlt;
  const fg = variant === 'secondary' ? colors.primary : '#fff';
  const isDisabled = !!(loading || disabled);
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: isDisabled ? 0.6 : pressed ? 0.85 : 1 },
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
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  text: { fontSize: 16, fontWeight: '600' },
});
