export const getValidPhoto = (photos?: string[] | null, fallback?: string): string => {
  if (Array.isArray(photos) && photos.length > 0) {
    const first = photos[0];
    if (typeof first === 'string' && first.trim() !== '') {
      return first;
    }
  }
  return fallback ?? 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=640&auto=format&fit=crop';
};

export const getValidPhotosArray = (photos?: string[] | null): string[] => {
  if (Array.isArray(photos) && photos.length > 0) {
    return photos.filter(p => typeof p === 'string');
  }
  return [];
};
