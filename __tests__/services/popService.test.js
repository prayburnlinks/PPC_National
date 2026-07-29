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
  addDoc,
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

  it('falls back to an inferred contentType when the file has no mimeType', async () => {
    ref.mockReturnValue('storage-ref');
    uploadBytes.mockResolvedValue();
    getDownloadURL.mockResolvedValue('https://storage.example.com/pop.png');
    writeBatch.mockReturnValue({ set: jest.fn(), update: jest.fn(), commit: jest.fn().mockResolvedValue() });

    await submitPOP(mockUser, { uri: 'file:///tmp/pop.png', name: 'pop.png' });

    expect(uploadBytes).toHaveBeenCalledWith(
      'storage-ref',
      expect.anything(),
      { contentType: 'image/png' }
    );
  });

  it('never sends an undefined contentType to Storage (would fail the rules regex)', async () => {
    ref.mockReturnValue('storage-ref');
    uploadBytes.mockResolvedValue();
    getDownloadURL.mockResolvedValue('https://storage.example.com/pop');
    writeBatch.mockReturnValue({ set: jest.fn(), update: jest.fn(), commit: jest.fn().mockResolvedValue() });

    // No mimeType and no recognizable extension
    await submitPOP(mockUser, { uri: 'file:///tmp/pop', name: 'pop' });

    const [, , metadata] = uploadBytes.mock.calls[0];
    expect(metadata.contentType).toBeDefined();
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

  it('creates a pop_status notification for the POP owner', async () => {
    updateDoc.mockResolvedValue();
    addDoc.mockResolvedValue({ id: 'notif-1' });

    await approvePOP('pop-1', 'uid-1', 'reviewer-uid');

    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ type: 'pop_status', title: 'Payment Approved', read: false })
    );
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

  it('creates a pop_status notification including the rejection reason', async () => {
    updateDoc.mockResolvedValue();
    addDoc.mockResolvedValue({ id: 'notif-1' });

    await rejectPOP('pop-1', 'uid-1', 'reviewer-uid', 'Blurry image');

    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: 'pop_status',
        title: 'Payment Not Approved',
        body: expect.stringContaining('Blurry image'),
      })
    );
  });
});
