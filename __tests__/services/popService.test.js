import {
  submitPOP,
  getPendingPOPs,
  approvePOP,
  rejectPOP,
} from '../../services/popService';

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((db, path) => ({ path })),
  doc: jest.fn((db, ...segments) => ({ path: segments.join('/') })),
  addDoc: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
  writeBatch: jest.fn(),
  query: jest.fn((...args) => args),
  where: jest.fn(),
  orderBy: jest.fn(),
  serverTimestamp: jest.fn(() => new Date('2026-01-01')),
}));

jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
}));

import {
  getDocs,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const mockUser = {
  uid: 'uid-1',
  name: 'Test User',
  congregation: 'Ebenezer',
  district: 'Southern Cape',
};

const mockFile = {
  uri: 'file:///tmp/pop.jpg',
  name: 'pop.jpg',
  mimeType: 'image/jpeg',
};

beforeEach(() => {
  jest.clearAllMocks();

  global.fetch = jest.fn(() =>
    Promise.resolve({ blob: () => Promise.resolve(new Blob()) })
  );
});

describe('submitPOP', () => {
  it('uploads file and writes POP + user status atomically', async () => {
    ref.mockReturnValue('storage-ref');
    uploadBytes.mockResolvedValue();
    getDownloadURL.mockResolvedValue('https://storage.example.com/pop.jpg');

    const mockCommit = jest.fn().mockResolvedValue();
    const mockSet = jest.fn();
    const mockUpdate = jest.fn();
    writeBatch.mockReturnValue({ set: mockSet, update: mockUpdate, commit: mockCommit });

    const result = await submitPOP(mockUser, mockFile);

    expect(uploadBytes).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: 'uid-1',
        status: 'pending',
        fileUrl: 'https://storage.example.com/pop.jpg',
      })
    );
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ popStatus: 'pending' })
    );
    expect(mockCommit).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  it('throws when file upload fails', async () => {
    ref.mockReturnValue('storage-ref');
    uploadBytes.mockRejectedValue(new Error('Upload failed'));

    await expect(submitPOP(mockUser, mockFile)).rejects.toMatchObject({
      message: expect.stringContaining('Failed to upload'),
    });
  });
});

describe('getPendingPOPs', () => {
  const mockPOPRow = ['pop-1', { userId: 'uid-1', status: 'pending', userName: 'Alice' }];

  it('fetches all pending POPs for admins', async () => {
    getDocs.mockResolvedValue({
      docs: [{ id: mockPOPRow[0], data: () => mockPOPRow[1] }],
    });

    const result = await getPendingPOPs('admin', null);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('pop-1');
  });

  it('filters by congregation for leaders', async () => {
    getDocs.mockResolvedValue({ docs: [] });

    const result = await getPendingPOPs('leader', 'Ebenezer');

    expect(result).toEqual([]);
  });

  it('returns empty array on error', async () => {
    getDocs.mockRejectedValue(new Error('Network error'));

    const result = await getPendingPOPs('admin', null);

    expect(result).toEqual([]);
  });
});

describe('approvePOP', () => {
  it('updates POP status to approved and user popStatus', async () => {
    updateDoc.mockResolvedValue();

    const result = await approvePOP('pop-1', 'uid-1', 'reviewer-uid');

    expect(updateDoc).toHaveBeenCalledTimes(2);
    const [, popUpdates] = updateDoc.mock.calls[0];
    expect(popUpdates).toMatchObject({ status: 'approved', reviewedBy: 'reviewer-uid' });

    const [, userUpdates] = updateDoc.mock.calls[1];
    expect(userUpdates).toMatchObject({ popStatus: 'approved' });

    expect(result.success).toBe(true);
  });

  it('throws on failure', async () => {
    updateDoc.mockRejectedValue(new Error('Permission denied'));

    await expect(approvePOP('pop-1', 'uid-1', 'reviewer')).rejects.toMatchObject({
      message: 'Failed to approve payment.',
    });
  });
});

describe('rejectPOP', () => {
  it('updates POP status to rejected with reason', async () => {
    updateDoc.mockResolvedValue();

    const result = await rejectPOP('pop-1', 'uid-1', 'reviewer-uid', 'Blurry image');

    const [, popUpdates] = updateDoc.mock.calls[0];
    expect(popUpdates).toMatchObject({
      status: 'rejected',
      rejectionReason: 'Blurry image',
      reviewedBy: 'reviewer-uid',
    });
    expect(result.success).toBe(true);
  });

  it('throws on failure', async () => {
    updateDoc.mockRejectedValue(new Error('Network error'));

    await expect(rejectPOP('pop-1', 'uid-1', 'reviewer')).rejects.toMatchObject({
      message: 'Failed to reject payment.',
    });
  });
});
