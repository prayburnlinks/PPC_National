import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import MyOrdersScreen from '../../screens/MyOrdersScreen';
import { UserContext } from '../../context/UserContext';

jest.mock('../../services/merchService', () => ({
  getUserMerchOrders: jest.fn(),
}));

import { getUserMerchOrders } from '../../services/merchService';

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
});
