const DB_NAME = 'filmadcc_media_db';
const DB_VERSION = 1;
const STORE_NAME = 'media_store';

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is only available in the browser'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'movieId' });
      }
    };
  });
}

export async function saveMovieMedia(
  movieId: string,
  adAudioBlob: Blob | null,
  ccSrtContent: string | null
): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const getRequest = store.get(movieId);
    
    getRequest.onsuccess = () => {
      const existing = getRequest.result || { movieId };
      const updated = {
        ...existing,
        ...(adAudioBlob !== null ? { adAudioBlob } : {}),
        ...(ccSrtContent !== null ? { ccSrtContent } : {}),
      };
      
      const putRequest = store.put(updated);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };
    
    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function getMovieMedia(
  movieId: string
): Promise<{ adAudioBlob: Blob | null; ccSrtContent: string | null }> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(movieId);
      
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          resolve({
            adAudioBlob: result.adAudioBlob || null,
            ccSrtContent: result.ccSrtContent || null,
          });
        } else {
          resolve({ adAudioBlob: null, ccSrtContent: null });
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('IndexedDB getMovieMedia failed:', e);
    return { adAudioBlob: null, ccSrtContent: null };
  }
}

export async function deleteMovieMedia(movieId: string): Promise<void> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(movieId);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('IndexedDB deleteMovieMedia failed:', e);
  }
}
