'use client';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';

const native = () => Capacitor.isNativePlatform();

// ---- IndexedDB (web) ----
function idb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open('tlapka-docs', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('blobs');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function tx<T>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await idb();
  return new Promise((res, rej) => {
    const q = f(db.transaction('blobs', mode).objectStore('blobs'));
    q.onsuccess = () => res(q.result as T);
    q.onerror = () => rej(q.error);
  });
}

const blobToB64 = (b: Blob) =>
  new Promise<string>((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result).split(',')[1] ?? '');
    fr.onerror = rej;
    fr.readAsDataURL(b);
  });
const path = (id: string) => `docs/${id}`;

export async function saveBlob(id: string, file: Blob) {
  if (native()) {
    await Filesystem.writeFile({ path: path(id), data: await blobToB64(file), directory: Directory.Data, recursive: true });
  } else {
    // store raw bytes, not a Blob: WebKit private mode / some iOS PWAs can't persist Blobs in IndexedDB
    const buf = await file.arrayBuffer();
    await tx('readwrite', (s) => s.put({ buf, mime: file.type }, id));
  }
}

export async function loadBlob(id: string, mime: string): Promise<Blob | null> {
  if (native()) {
    const r = await Filesystem.readFile({ path: path(id), directory: Directory.Data });
    if (r.data instanceof Blob) return r.data;
    const bin = atob(r.data);
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return new Blob([u], { type: mime });
  }
  const v = await tx<Blob | { buf: ArrayBuffer; mime: string } | undefined>('readonly', (s) => s.get(id));
  if (!v) return null;
  if (v instanceof Blob) return v; // legacy records
  return new Blob([v.buf], { type: v.mime || mime });
}

export async function deleteBlob(id: string) {
  if (native()) await Filesystem.deleteFile({ path: path(id), directory: Directory.Data });
  else await tx('readwrite', (s) => s.delete(id));
}
