import {
  getMediaLinks,
  saveMediaLinks,
  getFeaturedVideos,
  addFeaturedVideo,
  removeFeaturedVideo,
} from '../../services/mediaService';

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((db, path) => ({ path })),
  doc: jest.fn((db, ...segments) => ({ path: segments.join('/') })),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  addDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn((...args) => args),
  orderBy: jest.fn(),
  serverTimestamp: jest.fn(() => 'SERVER_TS'),
}));

import { getDoc, getDocs, setDoc, addDoc, deleteDoc } from 'firebase/firestore';

const admin = { uid: 'admin-1' };

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
});

describe('getMediaLinks', () => {
  it('returns the saved doc', async () => {
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ youtubeLiveUrl: 'https://youtube.com/live1' }),
    });

    expect(await getMediaLinks()).toEqual({ youtubeLiveUrl: 'https://youtube.com/live1' });
  });

  it('returns an empty object when nothing has been saved yet', async () => {
    getDoc.mockResolvedValue({ exists: () => false });

    expect(await getMediaLinks()).toEqual({});
  });

  it('throws rather than reporting "no links" when the read fails', async () => {
    getDoc.mockRejectedValue(new Error('offline'));

    await expect(getMediaLinks()).rejects.toEqual({ message: 'Failed to load media links.' });
  });
});

describe('saveMediaLinks', () => {
  it('merges the given links into config/mediaLinks', async () => {
    setDoc.mockResolvedValue();

    const result = await saveMediaLinks(admin, { youtubeLiveUrl: 'https://youtube.com/live2' });

    expect(result).toEqual({ success: true });
    expect(setDoc).toHaveBeenCalledWith(
      { path: 'config/mediaLinks' },
      { youtubeLiveUrl: 'https://youtube.com/live2', updatedBy: 'admin-1', updatedAt: 'SERVER_TS' },
      { merge: true }
    );
  });

  it('surfaces the failure to the caller', async () => {
    setDoc.mockRejectedValue(new Error('Missing or insufficient permissions.'));

    await expect(saveMediaLinks(admin, { youtubeLiveUrl: 'x' })).rejects.toEqual({
      message: 'Missing or insufficient permissions.',
    });
  });
});

describe('getFeaturedVideos', () => {
  it('returns videos with their doc id', async () => {
    getDocs.mockResolvedValue({
      docs: [
        { id: 'v1', data: () => ({ platform: 'youtube', url: 'https://y/1' }) },
        { id: 'v2', data: () => ({ platform: 'facebook', url: 'https://f/1' }) },
      ],
    });

    expect(await getFeaturedVideos()).toEqual([
      { id: 'v1', platform: 'youtube', url: 'https://y/1' },
      { id: 'v2', platform: 'facebook', url: 'https://f/1' },
    ]);
  });

  it('returns an empty list rather than throwing when the read fails', async () => {
    getDocs.mockRejectedValue(new Error('offline'));

    expect(await getFeaturedVideos()).toEqual([]);
  });
});

describe('addFeaturedVideo', () => {
  it('creates a doc with the given fields, defaulting blank assembly/district', async () => {
    addDoc.mockResolvedValue({ id: 'new-id' });

    const result = await addFeaturedVideo(admin, { platform: 'youtube', url: 'https://y/2' });

    expect(result).toEqual({ success: true, id: 'new-id' });
    expect(addDoc).toHaveBeenCalledWith(
      { path: 'featuredVideos' },
      {
        platform: 'youtube',
        url: 'https://y/2',
        assembly: '',
        district: '',
        createdBy: 'admin-1',
        createdAt: 'SERVER_TS',
      }
    );
  });

  it('keeps assembly and district when given', async () => {
    addDoc.mockResolvedValue({ id: 'new-id' });

    await addFeaturedVideo(admin, { platform: 'facebook', url: 'https://f/2', assembly: 'Ebenezer', district: 'Southern Cape' });

    expect(addDoc).toHaveBeenCalledWith(
      { path: 'featuredVideos' },
      expect.objectContaining({ assembly: 'Ebenezer', district: 'Southern Cape' })
    );
  });

  it('surfaces the failure to the caller', async () => {
    addDoc.mockRejectedValue(new Error('Missing or insufficient permissions.'));

    await expect(addFeaturedVideo(admin, { platform: 'youtube', url: 'x' })).rejects.toEqual({
      message: 'Missing or insufficient permissions.',
    });
  });
});

describe('removeFeaturedVideo', () => {
  it('deletes the doc by id', async () => {
    deleteDoc.mockResolvedValue();

    const result = await removeFeaturedVideo('v1');

    expect(result).toEqual({ success: true });
    expect(deleteDoc).toHaveBeenCalledWith({ path: 'featuredVideos/v1' });
  });

  it('surfaces the failure to the caller', async () => {
    deleteDoc.mockRejectedValue(new Error('offline'));

    await expect(removeFeaturedVideo('v1')).rejects.toEqual({ message: 'Failed to remove featured video.' });
  });
});
