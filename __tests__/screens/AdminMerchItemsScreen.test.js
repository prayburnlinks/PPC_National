import React from 'react';
import { Alert } from 'react-native';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import AdminMerchItemsScreen from '../../screens/AdminMerchItemsScreen';
import { UserContext } from '../../context/UserContext';

jest.mock('../../services/merchService', () => ({
  getAllMerchItemsForAdmin: jest.fn(),
  createMerchItem: jest.fn(),
  updateMerchItem: jest.fn(),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

import {
  getAllMerchItemsForAdmin,
  createMerchItem,
  updateMerchItem,
} from '../../services/merchService';
import * as DocumentPicker from 'expo-document-picker';

const adminUser = { uid: 'admin-1', name: 'Nadia', role: 'admin' };

const mockItem = {
  id: 'item-1',
  name: 'Burning Fire T-Shirt',
  description: 'Custom church t-shirt',
  price: 250,
  sizes: ['S', 'M', 'L'],
  published: true,
  imageUrl: 'https://storage.example.com/shirt.jpg',
};

const renderScreen = () => {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  return render(
    <UserContext.Provider value={{ user: adminUser, onLogin: jest.fn(), onLogout: jest.fn() }}>
      <AdminMerchItemsScreen navigation={navigation} />
    </UserContext.Provider>
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  getAllMerchItemsForAdmin.mockResolvedValue([mockItem]);
});

describe('AdminMerchItemsScreen', () => {
  // STORE-07
  it('creates a new item from the Add Item form', async () => {
    DocumentPicker.getDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///photo.jpg', name: 'photo.jpg', mimeType: 'image/jpeg' }],
    });
    createMerchItem.mockResolvedValue({ id: 'item-new' });

    const { getByText, getByPlaceholderText } = renderScreen();
    await waitFor(() => getByText('+ Add Item'));
    fireEvent.press(getByText('+ Add Item'));

    fireEvent.press(getByText('📷 Add Photo'));
    await waitFor(() => {
      expect(DocumentPicker.getDocumentAsync).toHaveBeenCalled();
    });

    fireEvent.changeText(getByPlaceholderText('e.g. Burning Fire T-Shirt'), 'PPC Cap');
    fireEvent.changeText(getByPlaceholderText('0'), '120');
    fireEvent.press(getByText('Save Item'));

    await waitFor(() => {
      expect(createMerchItem).toHaveBeenCalledWith(
        adminUser,
        expect.objectContaining({
          name: 'PPC Cap',
          price: 120,
          currency: 'ZAR',
          imageFile: expect.objectContaining({ uri: 'file:///photo.jpg' }),
        })
      );
    });
    // Back on the list after saving
    await waitFor(() => getByText('+ Add Item'));
  });

  // STORE-08
  it('blocks saving a new item without a photo or price', async () => {
    const { getByText, getByPlaceholderText } = renderScreen();
    await waitFor(() => getByText('+ Add Item'));
    fireEvent.press(getByText('+ Add Item'));

    fireEvent.changeText(getByPlaceholderText('e.g. Burning Fire T-Shirt'), 'PPC Cap');
    fireEvent.press(getByText('Save Item'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Missing Info',
      'Please fill in the name, price, and a photo before saving.'
    );
    expect(createMerchItem).not.toHaveBeenCalled();
  });

  // STORE-09
  it('toggles the published state from the item badge', async () => {
    updateMerchItem.mockResolvedValue(undefined);

    const { getByText } = renderScreen();
    await waitFor(() => getByText('Published'));
    fireEvent.press(getByText('Published'));

    await waitFor(() => {
      expect(updateMerchItem).toHaveBeenCalledWith('item-1', { published: false });
      expect(getByText('Unpublished')).toBeTruthy();
    });
  });

  // STORE-10
  it('saves an edit without requiring a new photo', async () => {
    updateMerchItem.mockResolvedValue(undefined);

    const { getByText, getByDisplayValue } = renderScreen();
    await waitFor(() => getByText('Edit'));
    fireEvent.press(getByText('Edit'));

    await waitFor(() => getByDisplayValue('250'));
    fireEvent.changeText(getByDisplayValue('250'), '300');
    fireEvent.press(getByText('Save Item'));

    await waitFor(() => {
      expect(updateMerchItem).toHaveBeenCalledWith(
        'item-1',
        expect.objectContaining({ name: 'Burning Fire T-Shirt', price: 300 })
      );
    });
    expect(updateMerchItem.mock.calls[0][1]).not.toHaveProperty('imageFile');
  });
});
