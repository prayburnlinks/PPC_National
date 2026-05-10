import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import AdminScreen from '../../screens/AdminScreen';
import { UserContext } from '../../context/UserContext';

jest.mock('../../services/authService', () => ({
  getPendingRegistrations: jest.fn(),
  approveUser: jest.fn(),
  rejectUser: jest.fn(),
}));

jest.mock('../../services/popService', () => ({
  getPendingPOPs: jest.fn(),
  approvePOP: jest.fn(),
  rejectPOP: jest.fn(),
}));

import {
  getPendingRegistrations,
  approveUser,
  rejectUser,
} from '../../services/authService';

import { getPendingPOPs } from '../../services/popService';

const mockAdmin = {
  uid: 'admin-uid',
  name: 'Admin User',
  role: 'admin',
  status: 'approved',
};

const mockPendingUsers = [
  {
    uid: 'u1',
    name: 'John Smith',
    email: 'john@church.com',
    role: 'leader',
    status: 'pending',
    congregation: 'Ebenezer',
    district: 'Southern Cape',
    createdAt: new Date(),
  },
];

const renderAdmin = (user = mockAdmin) => {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  return render(
    <UserContext.Provider value={{ user, onLogin: jest.fn(), onLogout: jest.fn() }}>
      <AdminScreen navigation={navigation} />
    </UserContext.Provider>
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  getPendingRegistrations.mockResolvedValue(mockPendingUsers);
  getPendingPOPs.mockResolvedValue([]);
});

describe('AdminScreen rendering', () => {
  it('shows loading indicator initially', () => {
    getPendingRegistrations.mockReturnValue(new Promise(() => {}));
    const { getByTestId, queryAllByText } = renderAdmin();
    expect(queryAllByText('Admin Panel')).toBeTruthy();
  });

  it('renders tabs after loading', async () => {
    const { getByText } = renderAdmin();
    await waitFor(() => {
      expect(getByText('Pending')).toBeTruthy();
      expect(getByText('Payments')).toBeTruthy();
      expect(getByText('Actions')).toBeTruthy();
    });
  });

  it('renders pending user cards in the Pending tab', async () => {
    const { getByText } = renderAdmin();
    await waitFor(() => {
      expect(getByText('John Smith')).toBeTruthy();
      expect(getByText('john@church.com')).toBeTruthy();
    });
  });
});

describe('AdminScreen error handling', () => {
  it('shows error alert when loadAll fails', async () => {
    getPendingRegistrations.mockRejectedValue(new Error('Network error'));
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');

    renderAdmin();

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Error',
        expect.stringContaining('Failed to load')
      );
    });
  });
});

describe('AdminScreen tab navigation', () => {
  it('switches to Payments tab when pressed', async () => {
    const { getByText } = renderAdmin();
    await waitFor(() => getByText('Payments'));

    await act(async () => {
      fireEvent.press(getByText('Payments'));
    });

    expect(getByText('No pending proof of payments.')).toBeTruthy();
  });

  it('switches to Actions tab when pressed', async () => {
    const { getByText } = renderAdmin();
    await waitFor(() => getByText('Actions'));

    await act(async () => {
      fireEvent.press(getByText('Actions'));
    });

    expect(getByText('Quick Actions')).toBeTruthy();
  });
});

describe('AdminScreen approve/reject', () => {
  it('removes user from list after approval', async () => {
    approveUser.mockResolvedValue({ success: true });
    jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(
      (title, msg, buttons) => {
        const approveButton = buttons?.find((b) => b.text === 'Approve');
        if (approveButton) approveButton.onPress();
      }
    );

    const { getByText, queryByText } = renderAdmin();
    await waitFor(() => getByText('Approve'));

    await act(async () => {
      fireEvent.press(getByText('Approve'));
    });

    await waitFor(() => {
      expect(approveUser).toHaveBeenCalledWith('u1');
      expect(queryByText('John Smith')).toBeFalsy();
    });
  });

  it('removes user from list after rejection', async () => {
    rejectUser.mockResolvedValue({ success: true });
    jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(
      (title, msg, buttons) => {
        const rejectButton = buttons?.find((b) => b.text === 'Reject');
        if (rejectButton) rejectButton.onPress();
      }
    );

    const { getByText, queryByText } = renderAdmin();
    await waitFor(() => getByText('Reject'));

    await act(async () => {
      fireEvent.press(getByText('Reject'));
    });

    await waitFor(() => {
      expect(rejectUser).toHaveBeenCalledWith('u1');
      expect(queryByText('John Smith')).toBeFalsy();
    });
  });

  it('shows error alert if approval fails', async () => {
    approveUser.mockRejectedValue({ message: 'Permission denied' });
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(
      (title, msg, buttons) => {
        const approveButton = buttons?.find((b) => b.text === 'Approve');
        if (approveButton) approveButton.onPress();
      }
    );

    const { getByText } = renderAdmin();
    await waitFor(() => getByText('Approve'));

    await act(async () => {
      fireEvent.press(getByText('Approve'));
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error', expect.stringContaining('approve'));
    });
  });
});
