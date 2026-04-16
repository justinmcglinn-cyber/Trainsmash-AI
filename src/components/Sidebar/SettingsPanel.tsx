import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useCollageStore } from '../../store/collage.store';
import { ExportPresetId, PRESETS } from '../../store/types';

const PRESET_ORDER: ExportPresetId[] = [
  'instagram_square',
  'instagram_portrait',
  'instagram_story',
  'facebook_square',
  'facebook_landscape',
];

const BG_PRESETS = ['#ffffff', '#000000', '#1a1a2e', '#f5f0eb', '#2d3436'];

function GapSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const steps = [0, 8, 16, 24, 32, 48, 64, 80];
  return (
    <View style={styles.gapRow}>
      {steps.map(step => (
        <TouchableOpacity
          key={step}
          style={[styles.gapStep, value === step && styles.gapStepActive]}
          onPress={() => onChange(step)}
        >
          <Text style={[styles.gapStepText, value === step && styles.gapStepTextActive]}>
            {step}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function SettingsPanel() {
  const canvasPreset = useCollageStore(s => s.canvasPreset);
  const setCanvasPreset = useCollageStore(s => s.setCanvasPreset);
  const backgroundColor = useCollageStore(s => s.backgroundColor);
  const setBackgroundColor = useCollageStore(s => s.setBackgroundColor);
  const gapPx = useCollageStore(s => s.gapPx);
  const setGapPx = useCollageStore(s => s.setGapPx);

  const [showCustomColor, setShowCustomColor] = useState(false);
  const [customColor, setCustomColor] = useState(backgroundColor);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Export Preset */}
      <Text style={styles.sectionTitle}>Export Size</Text>
      {PRESET_ORDER.map(id => {
        const preset = PRESETS[id];
        const active = id === canvasPreset;
        return (
          <TouchableOpacity
            key={id}
            style={[styles.presetRow, active && styles.presetRowActive]}
            onPress={() => setCanvasPreset(id)}
          >
            <View style={[styles.radio, active && styles.radioActive]}>
              {active && <View style={styles.radioDot} />}
            </View>
            <View style={styles.presetInfo}>
              <Text style={[styles.presetLabel, active && styles.presetLabelActive]}>
                {preset.label}
              </Text>
              <Text style={styles.presetDims}>
                {preset.width}×{preset.height}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}

      {/* Gap */}
      <Text style={[styles.sectionTitle, { marginTop: 16 }]}>
        Gap (px) — {gapPx}
      </Text>
      <GapSlider value={gapPx} onChange={setGapPx} />

      {/* Background Color */}
      <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Background</Text>
      <View style={styles.colorRow}>
        {BG_PRESETS.map(color => (
          <TouchableOpacity
            key={color}
            style={[
              styles.colorSwatch,
              { backgroundColor: color },
              backgroundColor === color && styles.colorSwatchActive,
            ]}
            onPress={() => setBackgroundColor(color)}
          />
        ))}
        <TouchableOpacity
          style={[styles.colorSwatch, styles.customSwatch]}
          onPress={() => setShowCustomColor(true)}
        >
          <Text style={styles.customSwatchText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Custom color input modal */}
      <Modal
        visible={showCustomColor}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCustomColor(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Custom Color</Text>
            <View style={styles.colorPreview}>
              <View style={[styles.colorPreviewSwatch, { backgroundColor: customColor }]} />
            </View>
            <TextInput
              style={styles.colorInput}
              value={customColor}
              onChangeText={setCustomColor}
              placeholder="#rrggbb"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={7}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowCustomColor(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalApplyBtn}
                onPress={() => {
                  if (/^#[0-9a-fA-F]{6}$/.test(customColor)) {
                    setBackgroundColor(customColor);
                    setShowCustomColor(false);
                  }
                }}
              >
                <Text style={styles.modalApplyText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 2,
  },
  presetRowActive: {
    backgroundColor: '#EEF4FF',
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#bbb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioActive: {
    borderColor: '#007AFF',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
  },
  presetInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  presetLabel: {
    fontSize: 13,
    color: '#333',
  },
  presetLabelActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  presetDims: {
    fontSize: 11,
    color: '#aaa',
  },
  gapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 4,
  },
  gapStep: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f5f5f5',
  },
  gapStepActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  gapStepText: {
    fontSize: 12,
    color: '#555',
  },
  gapStepTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  colorSwatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchActive: {
    borderColor: '#007AFF',
  },
  customSwatch: {
    backgroundColor: '#f0f0f0',
    borderColor: '#ddd',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customSwatchText: {
    fontSize: 20,
    color: '#888',
    lineHeight: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: 280,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 16,
    textAlign: 'center',
  },
  colorPreview: {
    alignItems: 'center',
    marginBottom: 12,
  },
  colorPreviewSwatch: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  colorInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'monospace',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  modalCancelText: {
    fontSize: 14,
    color: '#555',
  },
  modalApplyBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#007AFF',
  },
  modalApplyText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
});
