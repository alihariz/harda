// NFR14 — EN | BM segmented switch for the mobile app.
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useI18n, LANGS, LANG_LABEL } from '@/lib/i18n';
import { colors, radius } from '@/lib/theme';

export const LanguageToggle: React.FC = () => {
  const { lang, setLang } = useI18n();
  return (
    <View style={styles.wrap}>
      {LANGS.map((l) => {
        const active = l === lang;
        return (
          <TouchableOpacity
            key={l}
            onPress={() => setLang(l)}
            style={[styles.btn, active && styles.btnActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.text, active && styles.textActive]}>{LANG_LABEL[l]}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    padding: 2,
    alignSelf: 'flex-start',
  },
  btn: { paddingVertical: 4, paddingHorizontal: 14, borderRadius: radius.pill },
  btnActive: { backgroundColor: colors.primaryAccent },
  text: { fontSize: 13, fontWeight: '700', color: colors.muted },
  textActive: { color: '#fff' },
});
