import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { radius, spacing, statusColor } from '@/lib/theme';

export const StatusBadge: React.FC<{ status?: string | null }> = ({ status }) => {
  const { t } = useI18n();
  if (!status) return null;
  const color = statusColor(status);
  return (
    <View style={[styles.pill, { backgroundColor: `${color}20`, borderColor: color }]}>
      <Text style={[styles.text, { color }]}>{t(`status.${status}`)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
  },
  text: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
});
