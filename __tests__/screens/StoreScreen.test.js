import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import StoreScreen from '../../screens/StoreScreen';
import { UserContext } from '../../context/UserContext';

jest.mock('../../services/merchService', () => ({
  getMerchItems: jest.fn(),
  createMerchOrder: jest.fn(),
  submitOrderPayment: jest.fn(),
}));

import { getMerchItems, createMerchOrder } from '../../services/merchService';

const mockUser = { uid: 'uid-1', name: 'Alice', congregation: 'Ebenezer' };

const mockItem = {
  id: 'item-1',
  name: 'Burning Fire T-Shirt',
  description: 'Custom church t-shirt',
  price: 250,
  currency: 'R',
  sizes: ['S', 'M', 'L'],
  imageUrl: 'https://storage.example.com/shirt.jpg',
};

const renderScreen = () => {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  return render(
    <UserContext.Provider value={{ user: mockUser, onLogin: jest.fn(), onLogout: jest.fn() }}>
      <StoreScreen navigation={navigation} />
    </UserContext.Provider>
  );
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('StoreScreen', () => {
  it('shows each merchandise item', async () => {
    getMerchItems.mockResolvedValue([mockItem]);

    const { getByText } = renderScreen();

    await waitFor(() => {
      expect(getByText('Burning Fire T-Shirt')).toBeTruthy();
      expect(getByText('R250')).toBeTruthy();
    });
  });

  it('shows an empty state when there is no merchandise', async () => {
    getMerchItems.mockResolvedValue([]);

    const { getByText } = renderScreen();

    await waitFor(() => {
      expect(getByText('No Items Yet')).toBeTruthy();
    });
  });

  it('requires a size before placing an order', async () => {
    getMerchItems.mockResolvedValue([mockItem]);

    const { getByText } = renderScreen();
    await waitFor(() => getByText('Burning Fire T-Shirt'));
    fireEvent.press(getByText('Burning Fire T-Shirt'));

    await waitFor(() => getByText('Place Order'));
    fireEvent.press(getByText('Place Order'));

    expect(createMerchOrder).not.toHaveBeenCalled();
  });

  it('creates an order once a size is selected and shows payment details', async () => {
    getMerchItems.mockResolvedValue([mockItem]);
    createMerchOrder.mockResolvedValue({
      id: 'order-1',
      itemName: 'Burning Fire T-Shirt',
      size: 'M',
      quantity: 1,
      totalAmount: 250,
      currency: 'R',
      reference: 'Alice · Burning Fire T-Shirt',
    });

    const { getByText } = renderScreen();
    await waitFor(() => getByText('Burning Fire T-Shirt'));
    fireEvent.press(getByText('Burning Fire T-Shirt'));

    await waitFor(() => getByText('M'));
    fireEvent.press(getByText('M'));
    fireEvent.press(getByText('Place Order'));

    await waitFor(() => {
      expect(createMerchOrder).toHaveBeenCalledWith(mockUser, mockItem, 'M', 1);
      expect(getByText('Alice · Burning Fire T-Shirt')).toBeTruthy();
      expect(getByText('Upload Proof of Payment')).toBeTruthy();
    });
  });
});
