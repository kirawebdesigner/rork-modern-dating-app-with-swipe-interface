import { supabase } from './supabase';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

export const uploadImage = async (uri: string, userId: string): Promise<string | null> => {
  try {
    if (!uri.startsWith('file://')) {
      return uri; // Already a remote URL
    }

    const bucket = 'avatars'; // Default bucket name
    const fileName = `${userId}/${Date.now()}.jpg`;

    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      const blob = await response.blob();
      const { data, error } = await supabase.storage.from(bucket).upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
      return publicUrl;
    } else {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      const { data, error } = await supabase.storage.from(bucket).upload(fileName, decode(base64), {
        contentType: 'image/jpeg',
        upsert: true,
      });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
      return publicUrl;
    }
  } catch (error) {
    console.error('[Upload] Error uploading image:', error);
    return null;
  }
};

export const uploadPhotos = async (photos: string[], userId: string): Promise<string[]> => {
  const uploadPromises = photos.map(uri => uploadImage(uri, userId));
  const results = await Promise.all(uploadPromises);
  // Keep original URI if upload failed (so it doesn't get lost from local state)
  return results.map((url, index) => url ?? photos[index]);
};
