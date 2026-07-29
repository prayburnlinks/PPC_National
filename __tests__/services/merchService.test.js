import {
  createMerchOrder,
  submitOrderPayment,
  getUserMerchOrders,
  getPendingMerchOrders,
  approveMerchOrder,
  rejectMerchOrder,
} from '../../services/merchService';

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((db, path) => ({ path })),
  doc: jest.fn((db, ...segments) => ({ path: segments.join('/') })),
  addDoc: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
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

import { getDocs, updateDoc, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const mockUser = { uid: 'uid-1', name: 'Test User', congregation: 'Ebenezer', district: 'Southern Cape' };

const mockItem = {
  id: 'item-1',
  name: 'Burning Fire T-Shirt',
  price: 250,
  currency: 'ZAR',
  imageUrl: 'https://storage.example.com/shirt.jpg',
};

const mockFile = { uri: 'file:///tmp/proof.jpg', name: 'proof.jpg', mimeType: 'image/jpeg' };

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn(() => Promise.resolve({ blob: () => Promise.resolve(new Blob()) }));
});

describe('createMerchOrder', () => {
  it('creates an order doc with computed total and reference', async () => {
    addDoc.mockResolvedValue({ id: 'order-1' });

    const result = await createMerchOrder(mockUser, mockItem, 'L', 2);

    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: 'uid-1',
        itemId: 'item-1',
        size: 'L',
        quantity: 2,
        unitPrice: 250,
        totalAmount: 500,
        status: 'awaiting_payment',
        reference: 'Test User · Burning Fire T-Shirt',
      })
    );
    expect(result).toMatchObject({ id: 'order-1', totalAmount: 500, size: 'L', quantity: 2 });
  });

  it('throws on failure', async () => {
    addDoc.mockRejectedValue(new Error('Permission denied'));

    await expect(createMerchOrder(mockUser, mockItem, 'M', 1)).rejects.toMatchObject({
      message: 'Permission denied',
    });
  });
});

describe('submitOrderPayment', () => {
  const mockOrder = { id: 'order-1', currency: 'ZAR', totalAmount: 500 };

  it('uploads proof and updates the order to payment_submitted', async () => {
    ref.mockReturnValue('storage-ref');
    uploadBytes.mockResolvedValue();
    getDownloadURL.mockResolvedValue('https://storage.example.com/proof.jpg');
    updateDoc.mockResolvedValue();

    const result = await submitOrderPayment(mockOrder, mockUser, mockFile);

    expect(uploadBytes).toHaveBeenCalled();
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        fileUrl: 'https://storage.example.com/proof.jpg',
        status: 'payment_submitted',
      })
    );
    expect(result.success).toBe(true);
  });

  it('throws when upload fails', async () => {
    ref.mockReturnValue('storage-ref');
    uploadBytes.mockRejectedValue(new Error('Upload failed'));

    await expect(submitOrderPayment(mockOrder, mockUser, mockFile)).rejects.toMatchObject({
      message: expect.stringContaining('Failed to upload'),
    });
  });
});

describe('getUserMerchOrders', () => {
  it('returns the mapped list of orders for a user', async () => {
    getDocs.mockResolvedValue({
      docs: [{ id: 'order-1', data: () => ({ userId: 'uid-1', status: 'approved' }) }],
    });

    const result = await getUserMerchOrders('uid-1');

    expect(result).toEqual([{ id: 'order-1', userId: 'uid-1', status: 'approved' }]);
  });

  it('returns empty array on error', async () => {
    getDocs.mockRejectedValue(new Error('Network error'));

    const result = await getUserMerchOrders('uid-1');

    expect(result).toEqual([]);
  });
});

describe('getPendingMerchOrders', () => {
  it('fetches all payment_submitted orders for admins', async () => {
    getDocs.mockResolvedValue({
      docs: [{ id: 'order-1', data: () => ({ status: 'payment_submitted' }) }],
    });

    const result = await getPendingMerchOrders('admin', null);

    expect(result).toHaveLength(1);
  });

  it('filters by congregation for leaders', async () => {
    getDocs.mockResolvedValue({ docs: [] });

    const result = await getPendingMerchOrders('leader', 'Ebenezer');

    expect(result).toEqual([]);
  });
});

describe('approveMerchOrder', () => {
  it('updates order status to approved and notifies the owner', async () => {
    updateDoc.mockResolvedValue();
    addDoc.mockResolvedValue({ id: 'notif-1' });

    const result = await approveMerchOrder('order-1', 'uid-1', 'reviewer-uid');

    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'approved', reviewedBy: 'reviewer-uid' })
    );
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ type: 'merch_order_status', title: 'Order Approved' })
    );
    expect(result.success).toBe(true);
  });

  it('throws on failure', async () => {
    updateDoc.mockRejectedValue(new Error('Permission denied'));

    await expect(approveMerchOrder('order-1', 'uid-1', 'reviewer')).rejects.toMatchObject({
      message: 'Failed to approve order.',
    });
  });
});

describe('rejectMerchOrder', () => {
  it('updates order status to rejected with reason and notifies the owner', async () => {
    updateDoc.mockResolvedValue();
    addDoc.mockResolvedValue({ id: 'notif-1' });

    const result = await rejectMerchOrder('order-1', 'uid-1', 'reviewer-uid', 'Wrong reference');

    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'rejected', rejectionReason: 'Wrong reference' })
    );
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: 'merch_order_status',
        body: expect.stringContaining('Wrong reference'),
      })
    );
    expect(result.success).toBe(true);
  });

  it('throws on failure', async () => {
    updateDoc.mockRejectedValue(new Error('Network error'));

    await expect(rejectMerchOrder('order-1', 'uid-1', 'reviewer')).rejects.toMatchObject({
      message: 'Failed to reject order.',
    });
  });
});
