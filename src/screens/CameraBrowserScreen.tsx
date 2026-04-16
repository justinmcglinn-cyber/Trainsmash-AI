import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useLocalLibrary } from '../hooks/useLocalLibrary';
import { useCameraImport } from '../hooks/useCameraImport';
import { usePhotoImport } from '../hooks/usePhotoImport';
import { FolderRow } from '../components/FolderTree/FolderRow';

export function CameraBrowserScreen() {
  const navigation = useNavigation<any>();
  const { folders, loading, refresh } = useLocalLibrary();
  const { importFromCamera, importing, progress, error: importError } = useCameraImport();
  const { importLocalFiles, importing: loadingPhotos, progress: loadProgress } = usePhotoImport();

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedUris, setSelectedUris] = useState<Set<string>>(new Set());

  const toggleFolder = useCallback((uri: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      next.has(uri) ? next.delete(uri) : next.add(uri);
      return next;
    });
  }, []);

  const toggleFile = useCallback((uri: string) => {
    setSelectedUris(prev => {
      const next = new Set(prev);
      next.has(uri) ? next.delete(uri) : next.add(uri);
      return next;
    });
  }, []);

  const selectAllInFolder = useCallback((folder: ReturnType<typeof useLocalLibrary>['folders'][0]) => {
    const uris = folder.children.map(f => f.uri);
    setSelectedUris(prev => {
      const next = new Set(prev);
      const allSelected = uris.every(u => prev.has(u));
      allSelected ? uris.forEach(u => next.delete(u)) : uris.forEach(u => next.add(u));
      return next;
    });
  }, []);

  const handleImportFromCamera = useCallback(async () => {
    const count = await importFromCamera();
    if (count > 0) {
      await refresh();
      Alert.alert('Import complete', `${count} photo${count !== 1 ? 's' : ''} saved to your library.`);
    } else if (importError) {
      Alert.alert('Import error', importError);
    }
  }, [importFromCamera, refresh, importError]);

  const handleAddToCollage = useCallback(async () => {
    if (selectedUris.size === 0) return;
    const uris = Array.from(selectedUris);
    await importLocalFiles(uris);
    navigation.navigate('CollageEditor');
  }, [selectedUris, importLocalFiles, navigation]);

  const selectedCount = selectedUris.size;
  const busy = importing || loadingPhotos;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Photos</Text>
        <TouchableOpacity
          style={[styles.importBtn, importing && styles.btnDisabled]}
          onPress={handleImportFromCamera}
          disabled={importing}
        >
          <Text style={styles.importBtnText}>
            {importing ? 'Importing…' : '+ Import'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Import progress bar */}
      {importing && (
        <View style={styles.progressBar}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: progress.total > 0
                    ? `${(progress.done / progress.total) * 100}%`
                    : '0%',
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {progress.currentFile
              ? `${progress.done + 1}/${progress.total} — ${progress.currentFile}`
              : `${progress.done}/${progress.total}`}
          </Text>
        </View>
      )}

      {/* Library content */}
      {loading && !importing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : folders.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>📷</Text>
          <Text style={styles.emptyTitle}>No photos yet</Text>
          <Text style={styles.emptySubtitle}>
            Connect your Sony camera via USB-C, then tap "Import" to extract
            photos into your on-device Trainsmash library.
          </Text>
          <TouchableOpacity
            style={[styles.bigImportBtn, importing && styles.btnDisabled]}
            onPress={handleImportFromCamera}
            disabled={importing}
          >
            <Text style={styles.bigImportBtnText}>Import from Camera</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={folders}
          keyExtractor={item => item.uri}
          renderItem={({ item }) => (
            <FolderRow
              folder={item}
              expanded={expandedFolders.has(item.uri)}
              onToggle={() => toggleFolder(item.uri)}
              onSelectAll={() => selectAllInFolder(item)}
              selectedUris={selectedUris}
              onToggleFile={toggleFile}
            />
          )}
          ListFooterComponent={
            <TouchableOpacity style={styles.rescanBtn} onPress={handleImportFromCamera} disabled={importing}>
              <Text style={styles.rescanText}>Import more photos</Text>
            </TouchableOpacity>
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Add to Collage footer */}
      {selectedCount > 0 && (
        <View style={styles.footer}>
          <Text style={styles.footerCount}>{selectedCount} selected</Text>
          <TouchableOpacity
            style={[styles.collageBtn, busy && styles.btnDisabled]}
            onPress={handleAddToCollage}
            disabled={busy}
          >
            {loadingPhotos ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.collageBtnText}>
                Add to Collage →
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#111' },
  importBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  importBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  btnDisabled: { opacity: 0.45 },
  progressBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f8ff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  progressText: { fontSize: 11, color: '#666' },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 8 },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  bigImportBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  bigImportBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  listContent: { paddingBottom: 100 },
  rescanBtn: { alignItems: 'center', paddingVertical: 20 },
  rescanText: { color: '#007AFF', fontSize: 14 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingBottom: 28,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 6,
  },
  footerCount: { fontSize: 15, color: '#555', fontWeight: '500' },
  collageBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    minWidth: 160,
    alignItems: 'center',
  },
  collageBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
