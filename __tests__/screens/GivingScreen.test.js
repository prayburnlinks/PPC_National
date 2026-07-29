import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import GivingScreen from '../../screens/GivingScreen';
import { UserContext } from '../../context/UserContext';

jest.mock('../../services/firestoreService', () => ({
  logGivingTransaction: jest.fn(),
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(),
}));

import { logGivingTransaction } from '../../services/firestoreService';
import * as Clipboard from 'expo-clipboard';

const mockMember = {
  uid: 'uid-1',
  name: 'Alice',
  congregation: 'Ebenezer',
  role: 'member',
};

const mockVisitor = { role: 'visitor', name: 'Visitor' };

const renderGiving = (user = mockMember) => {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  return render(
    <UserContext.Provider value={{ user, onLogin: jest.fn(), onLogout: jest.fn() }}>
      <GivingScreen navigation={navigation} />
    </UserContext.Provider>
  );
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GivingScreen rendering', () => {
  it('renders fund options and defaults to the first fund and R100', () => {
    const { getByText } = renderGiving();
    expect(getByText('Tithes & Offerings')).toBeTruthy();
    expect(getByText(/Proceed to Give R100/)).toBeTruthy();
  });

  it('does not show the visitor name field for a signed-in member', () => {
    const { queryByText } = renderGiving(mockMember);
    expect(queryByText('Your Name (optional)')).toBeFalsy();
  });

  it('shows the visitor name field for a visitor (no uid)', () => {
    const { getByText } = renderGiving(mockVisitor);
    expect(getByText('Your Name (optional)')).toBeTruthy();
  });
});

describe('GivingScreen amount validation', () => {
  it('shows an error and does not submit when "Other" is selected with no amount entered', async () => {
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');
    const { getByText } = renderGiving();

    fireEvent.press(getByText('Other'));

    await act(async () => {
      fireEvent.press(getByText(/Proceed to Give/));
    });

    expect(alertSpy).toHaveBeenCalledWith('Error', 'Please select an amount');
    expect(logGivingTransaction).not.toHaveBeenCalled();
  });

  it('rejects a custom amount below R10', async () => {
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');
    const { getByText, getByPlaceholderText } = renderGiving();

    fireEvent.press(getByText('Other'));
    fireEvent.changeText(getByPlaceholderText('Enter amount in ZAR'), '5');

    await act(async () => {
      fireEvent.press(getByText(/Proceed to Give/));
    });

    expect(alertSpy).toHaveBeenCalledWith('Error', 'Please enter a valid amount of at least R10');
    expect(logGivingTransaction).not.toHaveBeenCalled();
  });
});

describe('GivingScreen member giving', () => {
  it('logs the transaction with the member reference and opens the bank details modal', async () => {
    logGivingTransaction.mockResolvedValue({ success: true, transactionId: 'tx-1' });

    const { getByText } = renderGiving(mockMember);

    await act(async () => {
      fireEvent.press(getByText(/Proceed to Give/));
    });

    expect(logGivingTransaction).toHaveBeenCalledWith(
      'uid-1',
      expect.objectContaining({
        fund: 'tithes',
        amount: 100,
        paymentMethod: 'eft',
        reference: 'Alice · Ebenezer',
      })
    );

    await waitFor(() => {
      expect(getByText('EFT Banking Details')).toBeTruthy();
      expect(getByText('Alice · Ebenezer')).toBeTruthy();
    });
  });
});

describe('GivingScreen visitor (anonymous) giving', () => {
  it('logs an anonymous transaction with a default reference when no name is entered', async () => {
    logGivingTransaction.mockResolvedValue({ success: true, transactionId: 'tx-2' });

    const { getByText } = renderGiving(mockVisitor);

    await act(async () => {
      fireEvent.press(getByText(/Proceed to Give/));
    });

    expect(logGivingTransaction).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ reference: 'Anonymous Visitor (Visitor)' })
    );

    await waitFor(() => {
      expect(getByText('Anonymous Visitor (Visitor)')).toBeTruthy();
    });
  });

  it('uses the entered name in the reference when provided', async () => {
    logGivingTransaction.mockResolvedValue({ success: true, transactionId: 'tx-3' });

    const { getByText, getByPlaceholderText } = renderGiving(mockVisitor);

    fireEvent.changeText(getByPlaceholderText('For your giving reference'), 'John Visitor');

    await act(async () => {
      fireEvent.press(getByText(/Proceed to Give/));
    });

    expect(logGivingTransaction).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ reference: 'John Visitor (Visitor)' })
    );
  });
});

describe('GivingScreen bank details modal', () => {
  it('copies the account number to the clipboard', async () => {
    logGivingTransaction.mockResolvedValue({ success: true, transactionId: 'tx-4' });
    Clipboard.setStringAsync.mockResolvedValue();
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');

    const { getByText, getAllByText } = renderGiving(mockMember);

    await act(async () => {
      fireEvent.press(getByText(/Proceed to Give/));
    });

    await waitFor(() => getByText('EFT Banking Details'));

    await act(async () => {
      fireEvent.press(getAllByText('Copy')[0]);
    });

    expect(Clipboard.setStringAsync).toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith('Copied', expect.stringContaining('copied to clipboard'));
  });
});
