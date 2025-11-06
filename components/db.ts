import { openDB, DBSchema } from 'idb';

const DB_NAME = 'media-db';
const STORE_NAME = 'media-store';
const DB_VERSION = 1;

interface MediaDB extends DBSchema {
  [STORE_NAME]: {
    key: string;
    value: Blob;
  };
}

const dbPromise = openDB<MediaDB>(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME);
    }
  },
});

export const addMedia = async (id: string, blob: Blob) => {
  return (await dbPromise).put(STORE_NAME, blob, id);
};

export const getMedia = async (id: string): Promise<Blob | undefined> => {
  return (await dbPromise).get(STORE_NAME, id);
};

export const deleteMedia = async (id: string) => {
  return (await dbPromise).delete(STORE_NAME, id);
};

export const clearMedia = async () => {
  return (await dbPromise).clear(STORE_NAME);
};
