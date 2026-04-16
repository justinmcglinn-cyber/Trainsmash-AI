import { SlotRect, TemplateId } from '../store/types';

export interface TemplateDefinition {
  id: TemplateId;
  label: string;
  slotCount: number;
  /** Returns slot rects at the given canvas dimensions and gap */
  getSlots: (canvasW: number, canvasH: number, gap: number) => SlotRect[];
}

export const TEMPLATES: Record<TemplateId, TemplateDefinition> = {
  '1x1': {
    id: '1x1',
    label: '1×1',
    slotCount: 1,
    getSlots: (w, h) => [{ x: 0, y: 0, w, h }],
  },

  '2x1': {
    id: '2x1',
    label: '2×1',
    slotCount: 2,
    getSlots: (w, h, g) => {
      const sw = (w - g) / 2;
      return [
        { x: 0, y: 0, w: sw, h },
        { x: sw + g, y: 0, w: sw, h },
      ];
    },
  },

  '1x2': {
    id: '1x2',
    label: '1×2',
    slotCount: 2,
    getSlots: (w, h, g) => {
      const sh = (h - g) / 2;
      return [
        { x: 0, y: 0, w, h: sh },
        { x: 0, y: sh + g, w, h: sh },
      ];
    },
  },

  '2x2': {
    id: '2x2',
    label: '2×2',
    slotCount: 4,
    getSlots: (w, h, g) => {
      const sw = (w - g) / 2;
      const sh = (h - g) / 2;
      return [
        { x: 0, y: 0, w: sw, h: sh },
        { x: sw + g, y: 0, w: sw, h: sh },
        { x: 0, y: sh + g, w: sw, h: sh },
        { x: sw + g, y: sh + g, w: sw, h: sh },
      ];
    },
  },

  '3x1': {
    id: '3x1',
    label: '3×1',
    slotCount: 3,
    getSlots: (w, h, g) => {
      const sw = (w - g * 2) / 3;
      return [
        { x: 0, y: 0, w: sw, h },
        { x: sw + g, y: 0, w: sw, h },
        { x: (sw + g) * 2, y: 0, w: sw, h },
      ];
    },
  },

  '1x3': {
    id: '1x3',
    label: '1×3',
    slotCount: 3,
    getSlots: (w, h, g) => {
      const sh = (h - g * 2) / 3;
      return [
        { x: 0, y: 0, w, h: sh },
        { x: 0, y: sh + g, w, h: sh },
        { x: 0, y: (sh + g) * 2, w, h: sh },
      ];
    },
  },

  '3x2': {
    id: '3x2',
    label: '3×2',
    slotCount: 6,
    getSlots: (w, h, g) => {
      const sw = (w - g * 2) / 3;
      const sh = (h - g) / 2;
      const slots: SlotRect[] = [];
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 3; col++) {
          slots.push({ x: col * (sw + g), y: row * (sh + g), w: sw, h: sh });
        }
      }
      return slots;
    },
  },

  '2x3': {
    id: '2x3',
    label: '2×3',
    slotCount: 6,
    getSlots: (w, h, g) => {
      const sw = (w - g) / 2;
      const sh = (h - g * 2) / 3;
      const slots: SlotRect[] = [];
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 2; col++) {
          slots.push({ x: col * (sw + g), y: row * (sh + g), w: sw, h: sh });
        }
      }
      return slots;
    },
  },

  '1_plus_2': {
    id: '1_plus_2',
    label: '1+2',
    slotCount: 3,
    getSlots: (w, h, g) => {
      const leftW = (w - g) * 0.6;
      const rightW = w - leftW - g;
      const sh = (h - g) / 2;
      return [
        { x: 0, y: 0, w: leftW, h },
        { x: leftW + g, y: 0, w: rightW, h: sh },
        { x: leftW + g, y: sh + g, w: rightW, h: sh },
      ];
    },
  },

  '2_plus_1': {
    id: '2_plus_1',
    label: '2+1',
    slotCount: 3,
    getSlots: (w, h, g) => {
      const rightW = (w - g) * 0.6;
      const leftW = w - rightW - g;
      const sh = (h - g) / 2;
      return [
        { x: 0, y: 0, w: leftW, h: sh },
        { x: 0, y: sh + g, w: leftW, h: sh },
        { x: leftW + g, y: 0, w: rightW, h },
      ];
    },
  },

  L_left: {
    id: 'L_left',
    label: 'L-Left',
    slotCount: 3,
    getSlots: (w, h, g) => {
      const topH = (h - g) * 0.35;
      const bottomH = h - topH - g;
      const leftW = (w - g) * 0.4;
      const rightW = w - leftW - g;
      return [
        { x: 0, y: 0, w, h: topH },
        { x: 0, y: topH + g, w: leftW, h: bottomH },
        { x: leftW + g, y: topH + g, w: rightW, h: bottomH },
      ];
    },
  },

  L_right: {
    id: 'L_right',
    label: 'L-Right',
    slotCount: 3,
    getSlots: (w, h, g) => {
      const topH = (h - g) * 0.35;
      const bottomH = h - topH - g;
      const rightW = (w - g) * 0.4;
      const leftW = w - rightW - g;
      return [
        { x: 0, y: 0, w, h: topH },
        { x: 0, y: topH + g, w: leftW, h: bottomH },
        { x: leftW + g, y: topH + g, w: rightW, h: bottomH },
      ];
    },
  },
};

export const TEMPLATE_ORDER: TemplateId[] = [
  '1x1', '2x1', '1x2', '2x2', '3x1', '1x3',
  '3x2', '2x3', '1_plus_2', '2_plus_1', 'L_left', 'L_right',
];
