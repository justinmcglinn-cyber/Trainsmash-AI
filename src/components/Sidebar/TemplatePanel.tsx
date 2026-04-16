import React from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Rect as SvgRect } from 'react-native-svg';
import { TemplateId, SlotRect } from '../../store/types';
import { TEMPLATE_ORDER, TEMPLATES } from '../../templates/templates';
import { useCollageStore } from '../../store/collage.store';

const THUMB_SIZE = 48;
const THUMB_GAP = 3;

function TemplateThumbnail({ id }: { id: TemplateId }) {
  const slots = TEMPLATES[id].getSlots(THUMB_SIZE, THUMB_SIZE, THUMB_GAP);
  return (
    <Svg width={THUMB_SIZE} height={THUMB_SIZE}>
      {slots.map((s: SlotRect, i: number) => (
        <SvgRect
          key={i}
          x={s.x + 0.5}
          y={s.y + 0.5}
          width={s.w - 1}
          height={s.h - 1}
          fill="#ccc"
          rx={1}
        />
      ))}
    </Svg>
  );
}

export function TemplatePanel() {
  const activeTemplate = useCollageStore(s => s.activeTemplate);
  const setTemplate = useCollageStore(s => s.setTemplate);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Layout</Text>
      <FlatList
        horizontal
        data={TEMPLATE_ORDER}
        keyExtractor={id => id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item: id }) => {
          const active = id === activeTemplate;
          return (
            <TouchableOpacity
              style={[styles.item, active && styles.itemActive]}
              onPress={() => setTemplate(id)}
              activeOpacity={0.7}
            >
              <TemplateThumbnail id={id} />
              <Text style={[styles.label, active && styles.labelActive]}>
                {TEMPLATES[id].label}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  list: {
    paddingHorizontal: 8,
  },
  item: {
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 8,
    marginHorizontal: 3,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  itemActive: {
    borderColor: '#007AFF',
    backgroundColor: '#EEF4FF',
  },
  label: {
    fontSize: 10,
    color: '#888',
    marginTop: 3,
  },
  labelActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
});
