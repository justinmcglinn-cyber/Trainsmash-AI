import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  CollageSlot,
  ExportPresetId,
  ExportStatus,
  Photo,
  TemplateId,
} from './types';
import { TEMPLATES } from '../templates/templates';

interface CollageState {
  // Canvas / export settings
  canvasPreset: ExportPresetId;
  backgroundColor: string;
  gapPx: number; // stored in export-resolution pixels

  // Layout
  activeTemplate: TemplateId;
  slots: CollageSlot[];

  // Photo library
  photos: Photo[];

  // UI state
  exportStatus: ExportStatus;
  lastExportUri: string | null;
}

interface CollageActions {
  setCanvasPreset: (preset: ExportPresetId) => void;
  setBackgroundColor: (color: string) => void;
  setGapPx: (gap: number) => void;
  setTemplate: (templateId: TemplateId) => void;
  addPhotos: (photos: Photo[]) => void;
  removePhoto: (photoId: string) => void;
  assignPhoto: (slotIndex: number, photoId: string) => void;
  clearSlot: (slotIndex: number) => void;
  updateSlotOffset: (slotIndex: number, offset: { x: number; y: number }) => void;
  updateSlotScale: (slotIndex: number, scale: number) => void;
  setExportStatus: (status: ExportStatus) => void;
  setLastExportUri: (uri: string | null) => void;
  reset: () => void;
}

const DEFAULT_SLOT: CollageSlot = {
  photoId: null,
  offsetX: 0,
  offsetY: 0,
  scale: 1,
};

const initialState: CollageState = {
  canvasPreset: 'instagram_square',
  backgroundColor: '#ffffff',
  gapPx: 20,
  activeTemplate: '2x1',
  slots: [DEFAULT_SLOT, DEFAULT_SLOT],
  photos: [],
  exportStatus: 'idle',
  lastExportUri: null,
};

function buildSlots(templateId: TemplateId, existing: CollageSlot[]): CollageSlot[] {
  const count = TEMPLATES[templateId].slotCount;
  return Array.from({ length: count }, (_, i) => existing[i] ?? { ...DEFAULT_SLOT });
}

export const useCollageStore = create<CollageState & CollageActions>()(
  immer((set) => ({
    ...initialState,

    setCanvasPreset: (preset) =>
      set((state) => {
        state.canvasPreset = preset;
      }),

    setBackgroundColor: (color) =>
      set((state) => {
        state.backgroundColor = color;
      }),

    setGapPx: (gap) =>
      set((state) => {
        state.gapPx = gap;
      }),

    setTemplate: (templateId) =>
      set((state) => {
        state.activeTemplate = templateId;
        state.slots = buildSlots(templateId, state.slots);
      }),

    addPhotos: (photos) =>
      set((state) => {
        const existingIds = new Set(state.photos.map((p) => p.id));
        for (const photo of photos) {
          if (!existingIds.has(photo.id)) {
            state.photos.push(photo);
          }
        }
      }),

    removePhoto: (photoId) =>
      set((state) => {
        state.photos = state.photos.filter((p) => p.id !== photoId);
        for (const slot of state.slots) {
          if (slot.photoId === photoId) {
            slot.photoId = null;
            slot.offsetX = 0;
            slot.offsetY = 0;
            slot.scale = 1;
          }
        }
      }),

    assignPhoto: (slotIndex, photoId) =>
      set((state) => {
        if (slotIndex >= 0 && slotIndex < state.slots.length) {
          state.slots[slotIndex].photoId = photoId;
          state.slots[slotIndex].offsetX = 0;
          state.slots[slotIndex].offsetY = 0;
          state.slots[slotIndex].scale = 1;
        }
      }),

    clearSlot: (slotIndex) =>
      set((state) => {
        if (slotIndex >= 0 && slotIndex < state.slots.length) {
          state.slots[slotIndex] = { ...DEFAULT_SLOT };
        }
      }),

    updateSlotOffset: (slotIndex, offset) =>
      set((state) => {
        if (slotIndex >= 0 && slotIndex < state.slots.length) {
          state.slots[slotIndex].offsetX = offset.x;
          state.slots[slotIndex].offsetY = offset.y;
        }
      }),

    updateSlotScale: (slotIndex, scale) =>
      set((state) => {
        if (slotIndex >= 0 && slotIndex < state.slots.length) {
          state.slots[slotIndex].scale = scale;
        }
      }),

    setExportStatus: (status) =>
      set((state) => {
        state.exportStatus = status;
      }),

    setLastExportUri: (uri) =>
      set((state) => {
        state.lastExportUri = uri;
      }),

    reset: () => set(() => ({ ...initialState })),
  }))
);
