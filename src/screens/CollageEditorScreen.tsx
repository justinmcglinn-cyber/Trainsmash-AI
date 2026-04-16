import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useCollageStore } from '../store/collage.store';
import { SkiaCollageCanvas } from '../components/Canvas/SkiaCollageCanvas';
import { TemplatePanel } from '../components/Sidebar/TemplatePanel';
import { SettingsPanel } from '../components/Sidebar/SettingsPanel';
import { PhotoThumbnail } from '../components/PhotoGrid/PhotoThumbnail';
import { useCollageExport } from '../hooks/useCollageExport';
import { Photo } from '../store/types';

type Tab = 'layout' | 'settings';

const SCREEN_WIDTH = Dimensions.get('window').width;

export function CollageEditorScreen() {
  const navigation = useNavigation<any>();
  const photos = useCollageStore(s => s.photos);
  const slots = useCollageStore(s => s.slots);
  const assignPhoto = useCollageStore(s => s.assignPhoto);
  const exportStatus = useCollageStore(s => s.exportStatus);

  const { exportCollage } = useCollageExport();

  const [activeTab, setActiveTab] = useState<Tab>('layout');
  const [draggingPhoto, setDraggingPhoto] = useState<Photo | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  const handleLongPressPhoto = useCallback((photo: Photo) => {
    setDraggingPhoto(photo);
    // Show slot selection prompt
    Alert.alert(
      'Assign to Slot',
      `Assign "${photo.fileName}" to a slot`,
      slots.map((slot, i) => ({
        text: `Slot ${i + 1}${slot.photoId ? ' (replace)' : ''}`,
        onPress: () => {
          assignPhoto(i, photo.id);
          setDraggingPhoto(null);
        },
      })).concat([
        { text: 'Cancel', onPress: () => setDraggingPhoto(null), style: 'cancel' } as any,
      ])
    );
  }, [slots, assignPhoto]);

  const handleExport = useCallback(async () => {
    const filled = slots.filter(s => s.photoId).length;
    if (filled === 0) {
      Alert.alert('No photos', 'Add at least one photo to a slot before exporting.');
      return;
    }
    try {
      await exportCollage();
      Alert.alert('Saved!', 'Your collage has been saved to your photo library.');
    } catch (e) {
      Alert.alert('Export Failed', e instanceof Error ? e.message : 'Unknown error');
    }
  }, [slots, exportCollage]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.navigate('CameraBrowser')}
        >
          <Text style={styles.backBtnText}>← Photos</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Collage</Text>
        <TouchableOpacity
          style={[styles.exportBtn, exportStatus === 'exporting' && styles.exportBtnDisabled]}
          onPress={handleExport}
          disabled={exportStatus === 'exporting'}
        >
          {exportStatus === 'exporting' ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.exportBtnText}>Export</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        {/* Left: photo library */}
        <View style={styles.photoLibrary}>
          <Text style={styles.libraryTitle}>Photos</Text>
          <FlatList
            data={photos}
            keyExtractor={p => p.id}
            renderItem={({ item }) => (
              <PhotoThumbnail
                photo={item}
                onLongPress={handleLongPressPhoto}
                isDragging={draggingPhoto?.id === item.id}
              />
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.photoList}
            ListEmptyComponent={
              <Text style={styles.emptyLibrary}>No photos yet</Text>
            }
            ListFooterComponent={
              <TouchableOpacity
                style={styles.addMoreBtn}
                onPress={() => navigation.navigate('CameraBrowser')}
              >
                <Text style={styles.addMoreText}>+ Add</Text>
              </TouchableOpacity>
            }
          />
        </View>

        {/* Center: canvas */}
        <View style={styles.canvasArea}>
          <ScrollView
            contentContainerStyle={styles.canvasScroll}
            showsVerticalScrollIndicator={false}
          >
            <SkiaCollageCanvas />
          </ScrollView>
        </View>

        {/* Right: controls */}
        <View style={styles.controlPanel}>
          {/* Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'layout' && styles.tabActive]}
              onPress={() => setActiveTab('layout')}
            >
              <Text style={[styles.tabText, activeTab === 'layout' && styles.tabTextActive]}>
                Layout
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'settings' && styles.tabActive]}
              onPress={() => setActiveTab('settings')}
            >
              <Text style={[styles.tabText, activeTab === 'settings' && styles.tabTextActive]}>
                Settings
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'layout' ? <TemplatePanel /> : <SettingsPanel />}
        </View>
      </View>

      {/* Slot assignment hint */}
      {draggingPhoto && (
        <View style={styles.dragHint}>
          <Text style={styles.dragHintText}>
            Long-press a photo to assign it to a slot
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
  },
  backBtn: {
    paddingHorizontal: 4,
  },
  backBtnText: {
    fontSize: 14,
    color: '#007AFF',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  exportBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 8,
    minWidth: 72,
    alignItems: 'center',
  },
  exportBtnDisabled: {
    backgroundColor: '#aaa',
  },
  exportBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
  },
  photoLibrary: {
    width: 88,
    backgroundColor: '#fff',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
  },
  libraryTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 6,
  },
  photoList: {
    paddingHorizontal: 8,
    paddingBottom: 16,
    alignItems: 'center',
  },
  emptyLibrary: {
    fontSize: 11,
    color: '#aaa',
    textAlign: 'center',
    paddingTop: 20,
    paddingHorizontal: 8,
  },
  addMoreBtn: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addMoreText: {
    fontSize: 12,
    color: '#007AFF',
  },
  canvasArea: {
    flex: 1,
    backgroundColor: '#e8e8e8',
  },
  canvasScroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  controlPanel: {
    width: 180,
    backgroundColor: '#fff',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 13,
    color: '#888',
  },
  tabTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  dragHint: {
    position: 'absolute',
    bottom: 24,
    left: 100,
    right: 100,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  dragHintText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
});
