import { getDB } from './schema';
import type { Link } from '../models/types';
import { v4 as uuidv4 } from 'uuid';

export async function getAllLinks(): Promise<Link[]> {
  const db = await getDB();
  const tx = db.transaction('links', 'readonly');
  const index = tx.store.index('by-order');
  const allLinks = await index.getAll();
  return allLinks.filter((l) => !l.deletedAt);
}

export async function getLink(id: string): Promise<Link | undefined> {
  const db = await getDB();
  return db.get('links', id);
}

export async function createLink(data: Omit<Link, 'id' | 'createdAt' | 'order'>): Promise<Link> {
  const db = await getDB();
  const tx = db.transaction('links', 'readwrite');
  const index = tx.store.index('by-order');

  let maxOrder = -1;
  const cursor = await index.openCursor(null, 'prev');
  if (cursor) {
    maxOrder = cursor.value.order;
  }

  const newLink: Link = {
    ...data,
    id: uuidv4(),
    createdAt: Date.now(),
    order: maxOrder + 1
  };

  await tx.store.add(newLink);
  await tx.done;
  return newLink;
}

export async function updateLink(
  id: string,
  updates: Partial<Omit<Link, 'id' | 'createdAt'>>
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('links', 'readwrite');
  const link = await tx.store.get(id);
  if (!link) {
    throw new Error(`Link com ID ${id} não encontrado.`);
  }

  const updatedLink = { ...link, ...updates };
  await tx.store.put(updatedLink);
  await tx.done;
}

export async function deleteLink(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('links', 'readwrite');
  const link = await tx.store.get(id);
  if (link) {
    link.deletedAt = Date.now();
    await tx.store.put(link);
  }
  await tx.done;
}

export async function hardDeleteLink(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('links', id);
}

export async function getAllDeletedLinks(): Promise<Link[]> {
  const db = await getDB();
  const allLinks = await db.getAll('links');
  return allLinks.filter((l) => !!l.deletedAt);
}

export async function restoreLink(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('links', 'readwrite');
  const link = await tx.store.get(id);
  if (link) {
    link.deletedAt = null;
    await tx.store.put(link);
  }
  await tx.done;
}

export async function reorderLinks(linkIds: string[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('links', 'readwrite');

  for (let i = 0; i < linkIds.length; i++) {
    const id = linkIds[i];
    if (!id) {
      continue;
    }
    const link = await tx.store.get(id);
    if (link) {
      link.order = i;
      await tx.store.put(link);
    }
  }

  await tx.done;
}
