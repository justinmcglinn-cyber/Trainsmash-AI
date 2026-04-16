import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useCameraVolume, CameraFolder } from '../hooks/useCameraVolume';
import { FolderRow } from '../components/FolderTree/FolderRow';
import { usePhotoImport } from '../hooks/usePhotoImport';

export function CameraBrowserScreen() {
  const navigation = useNavigation<any>();
  const { folders, loading, error, openCamera } = useCameraVolume();
  const { importFiles, importing, progress } = usePhotoImport();

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedUris, setSelectedUris] = useState<Set<string>>(new Set());

  const toggleFolder = useCallback((uri: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(uri)) {
        next.delete(uri);
      } else {
        next.add(uri);
      }
      return next;
    });
  }, []);

  const toggleFile = useCallback((uri: string) => {
    setSelectedUris(prev => {
      const next = new Set(prev);
      if (next.has(uri)) {
        next.delete(uri);
      } else {
        next.add(uri);
      }
      return next;
    });
  }, []);

  const selectAllInFolder = useCallback((folder: CameraFolder) => {
    const uris = (folder.children ?? []).map(f => f.uri);
    setSelectedUris(prev => {
      const next = new Set(prev);
      const allSelected = uris.every(u => prev.has(u));
      if (allSelected) {
        uris.forEach(u => next.delete(u));
      } else {
        uris.forEach(u => next.add(u));
      }
      return next;
    });
  }, []);

  const handleImport = useCallback(async () => {
    if (selectedUris.size === 0) return;
    await importFiles(Array.from(selectedUris));
    navigation.navigate('CollageEditor');
  }, [selectedUris, importFiles, navigation]);

  const selectedCount = selectedUris.size;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Browse Camera</Text>
        {selectedCount > 0 && (
          <TouchableOpacity
            style={[styles.importBtn, importing && styles.importBtnDisabled]}
            onPress={handleImport}
            disabled={importing}
          >
            {importing ? (
              <Text style={styles.importBtnText}>
                Importing {progress.done}/{progress.total}…
              </Text>
            ) : (
              <Text style={styles.importBtnText}>Import {selectedCount}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Empty / error / loading state */}
      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Reading folder…</Text>
        </View>
      )}

      {!loading && error && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.connectBtn} onPress={openCamera}>
            <Text style={styles.connectBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && folders.length === 0 && (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>📷</Text>
          <Text style={styles.emptyTitle}>Connect Your Sony Camera</Text>
          <Text style={styles.emptySubtitle}>
            Plug in your camera via USB-C, then tap the button below to browse its DCIM folders.
          </Text>
          <TouchableOpacity style={styles.connectBtn} onPress={openCamera}>
            <Text style={styles.connectBtnText}>Browse Camera</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Folder list */}
      {folders.length > 0 && (
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
            <TouchableOpacity style={styles.rescanBtn} onPress={openCamera}>
              <Text style={styles.rescanText}>Browse Different Folder</Text>
            </TouchableOpacity>
          }
        />
      )}

      {/* Importing overlay */}
      {importing && (
        <View style={styles.importingOverlay}>
          <View style={styles.importingCard}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.importingTitle}>
              Extracting previews…
            </Text>
            <Text style={styles.importingProgress}>
              {progress.done} of {progress.total}
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%` },
                ]}
              />
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  importBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  importBtnDisabled: {
    backgroundColor: '#aaa',
  },
  importBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  connectBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  connectBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    color: '#d00',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  rescanBtn: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  rescanText: {
    color: '#007AFF',
    fontSize: 14,
  },
  importingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  importingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 28,
    width: 260,
    alignItems: 'center',
  },
  importingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginTop: 14,
  },
  importingProgress: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  progressBar: {
    marginTop: 14,
    width: '100%',
    height: 4,
    backgroundColor: '#eee',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
});
