import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import MyOrdersScreen from '../../screens/MyOrdersScreen';
import { UserContext } from '../../context/UserContext';

jest.mock('../../services/merchService', () => ({
  getUserMerchOrders: jest.fn(),
  submitOrderPayment: jest.fn(),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(),
}));

import { getUserMerchOrders, submitOrderPayment } from '../../services/merchService';
import * as DocumentPicker from 'expo-document-picker';

const mockUser = { uid: 'uid-1', name: 'Alice', congregation: 'Ebenezer' };

const renderScreen = () => {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  return render(
    <UserContext.Provider value={{ user: mockUser, onLogin: jest.fn(), onLogout: jest.fn() }}>
      <MyOrdersScreen navigation={navigation} />
    </UserContext.Provider>
  );
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('MyOrdersScreen', () => {
  it('shows each order with its status', async () => {
    getUserMerchOrders.mockResolvedValue([
      {
        id: 'order-1',
        itemName: 'Burning Fire T-Shirt',
        itemImageUrl: 'https://storage.example.com/shirt.jpg',
        size: 'M',
        quantity: 2,
        totalAmount: 500,
        status: 'approved',
        createdAt: new Date('2026-07-01'),
      },
    ]);

    const { getByText } = renderScreen();

    await waitFor(() => {
      expect(getByText('Burning Fire T-Shirt')).toBeTruthy();
      expect(getByText('Size M · Qty 2')).toBeTruthy();
      expect(getByText('R500')).toBeTruthy();
      expect(getByText('Approved')).toBeTruthy();
    });
  });

  it('shows an empty state when there are no orders', async () => {
    getUserMerchOrders.mockResolvedValue([]);

    const { getByText } = renderScreen();

    await waitFor(() => {
      expect(getByText('No Orders Yet')).toBeTruthy();
    });
  });

  it('offers proof-of-payment upload with bank details only for awaiting-payment orders', async () => {
    getUserMerchOrders.mockResolvedValue([
      {
        id: 'order-1',
        itemName: 'Burning Fire T-Shirt',
        totalAmount: 250,
        quantity: 1,
        status: 'awaiting_payment',
        reference: 'Alice · Burning Fire T-Shirt',
        createdAt: new Date('2026-08-01'),
      },
      {
        id: 'order-2',
        itemName: 'PPC Cap',
        totalAmount: 120,
        quantity: 1,
        status: 'approved',
        createdAt: new Date('2026-07-01'),
      },
    ]);

    const { getByText, getAllByText } = renderScreen();

    await waitFor(() => {
      expect(getByText(/Absa · 4056725472 · Ref: Alice · Burning Fire T-Shirt/)).toBeTruthy();
      // Exactly one upload button — only the unpaid order gets one
      expect(getAllByText('Upload Proof of Payment')).toHaveLength(1);
    });
  });

  it('shows the rejection reason and allows resubmission for a rejected order', async () => {
    getUserMerchOrders.mockResolvedValue([
      {
        id: 'order-1',
        itemName: 'Burning Fire T-Shirt',
        totalAmount: 250,
        quantity: 1,
        status: 'rejected',
        rejectionReason: 'Reference did not match',
        createdAt: new Date('2026-08-01'),
      },
    ]);
    const pickedFile = { uri: 'file:///proof2.jpg', name: 'proof2.jpg', mimeType: 'image/jpeg' };
    DocumentPicker.getDocumentAsync.mockResolvedValue({ canceled: false, assets: [pickedFile] });
    submitOrderPayment.mockResolvedValue({ success: true });

    const { getByText } = renderScreen();

    await waitFor(() => {
      expect(getByText('Rejected')).toBeTruthy();
      expect(getByText('Reference did not match')).toBeTruthy();
    });

    fireEvent.press(getByText('Resubmit Proof of Payment'));

    await waitFor(() => {
      expect(submitOrderPayment).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'order-1' }),
        mockUser,
        pickedFile
      );
    });
  });

  it('uploads proof of payment for the specific order tapped', async () => {
    const unpaidOrder = {
      id: 'order-1',
      itemName: 'Burning Fire T-Shirt',
      totalAmount: 250,
      quantity: 1,
      status: 'awaiting_payment',
      reference: 'Alice · Burning Fire T-Shirt',
      createdAt: new Date('2026-08-01'),
    };
    getUserMerchOrders.mockResolvedValue([unpaidOrder]);
    const pickedFile = { uri: 'file:///proof.jpg', name: 'proof.jpg', mimeType: 'image/jpeg' };
    DocumentPicker.getDocumentAsync.mockResolvedValue({ canceled: false, assets: [pickedFile] });
    submitOrderPayment.mockResolvedValue({ success: true });

    const { getByText } = renderScreen();
    await waitFor(() => getByText('Upload Proof of Payment'));
    fireEvent.press(getByText('Upload Proof of Payment'));

    await waitFor(() => {
      expect(submitOrderPayment).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'order-1' }),
        mockUser,
        pickedFile
      );
    });
  });
});
