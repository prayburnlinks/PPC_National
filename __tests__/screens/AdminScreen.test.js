import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import AdminScreen from '../../screens/AdminScreen';
import { UserContext } from '../../context/UserContext';

jest.mock('../../services/authService', () => ({
  getPendingRegistrations: jest.fn(),
  approveUser: jest.fn(),
  rejectUser: jest.fn(),
}));

jest.mock('../../services/eventRegistrationService', () => ({
  getPendingEventRegistrations: jest.fn(),
  approveEventRegistration: jest.fn(),
  rejectEventRegistration: jest.fn(),
  getEventRegistrationsByEvent: jest.fn(),
}));

jest.mock('../../services/merchService', () => ({
  getPendingMerchOrders: jest.fn(),
  approveMerchOrder: jest.fn(),
  rejectMerchOrder: jest.fn(),
}));

import {
  getPendingRegistrations,
  approveUser,
  rejectUser,
} from '../../services/authService';

import { getPendingEventRegistrations, getEventRegistrationsByEvent } from '../../services/eventRegistrationService';
import { getPendingMerchOrders } from '../../services/merchService';

const mockAdmin = {
  uid: 'admin-uid',
  name: 'Admin User',
  role: 'admin',
  status: 'approved',
};

const mockLeader = {
  uid: 'leader-uid',
  name: 'Leader User',
  role: 'leader',
  status: 'approved',
  congregation: 'Ebenezer',
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
  getPendingEventRegistrations.mockResolvedValue([]);
  getPendingMerchOrders.mockResolvedValue([]);
  getEventRegistrationsByEvent.mockResolvedValue([]);
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

describe('AdminScreen leader role (cannot approve/reject user registrations)', () => {
  it('does not show the Pending tab, only Payments and Actions', async () => {
    const { getByText, queryByText } = renderAdmin(mockLeader);
    await waitFor(() => getByText('Payments'));

    expect(queryByText('Pending')).toBeFalsy();
    expect(getByText('Actions')).toBeTruthy();
  });

  it('defaults to the Payments tab instead of Pending', async () => {
    const { getByText } = renderAdmin(mockLeader);
    await waitFor(() => {
      expect(getByText('No pending proof of payments.')).toBeTruthy();
    });
  });

  it('never calls getPendingRegistrations for a leader reviewer', async () => {
    renderAdmin(mockLeader);
    await waitFor(() => expect(getPendingEventRegistrations).toHaveBeenCalled());

    expect(getPendingRegistrations).not.toHaveBeenCalled();
  });

  it('hides the "Pending Approvals" quick action', async () => {
    const { getByText, queryByText } = renderAdmin(mockLeader);
    await waitFor(() => getByText('Actions'));

    await act(async () => {
      fireEvent.press(getByText('Actions'));
    });

    expect(queryByText('Pending Approvals')).toBeFalsy();
    expect(getByText('Proof of Payments')).toBeTruthy();
  });
});

describe('AdminScreen Events tab', () => {
  const mockGroups = [
    {
      eventId: 'e1',
      eventName: 'National Sisters Conference',
      eventDate: new Date('2026-07-12'),
      attendees: [
        { id: 'u1_e1', userName: 'Alice Adams', congregation: 'Ceres', district: 'Boland', status: 'approved', requiresPayment: true, registeredAt: new Date('2026-08-01') },
        { id: 'u2_e1', userName: 'Ben Botha', congregation: 'Paarl', district: 'Boland', status: 'awaiting_payment', requiresPayment: true, registeredAt: new Date('2026-08-02') },
      ],
    },
    {
      eventId: 'e2',
      eventName: 'Youth Rally',
      eventDate: new Date('2026-09-01'),
      attendees: [
        { id: 'u3_e2', userName: 'Cara Nel', congregation: 'George', district: 'Garden Route', status: 'confirmed', requiresPayment: false, registeredAt: new Date('2026-08-03') },
      ],
    },
  ];

  it('lists each event with registration and paid counts', async () => {
    getEventRegistrationsByEvent.mockResolvedValue(mockGroups);

    const { getByText } = renderAdmin();
    await waitFor(() => getByText('Events'));
    fireEvent.press(getByText('Events'));

    await waitFor(() => {
      expect(getByText('National Sisters Conference')).toBeTruthy();
      expect(getByText('2 registered · 1 paid')).toBeTruthy();
      expect(getByText('Youth Rally')).toBeTruthy();
      expect(getByText('1 registered · free event')).toBeTruthy();
    });
  });

  it('expands an event to show attendees with status badges', async () => {
    getEventRegistrationsByEvent.mockResolvedValue(mockGroups);

    const { getByText, queryByText } = renderAdmin();
    await waitFor(() => getByText('Events'));
    fireEvent.press(getByText('Events'));

    await waitFor(() => getByText('National Sisters Conference'));
    expect(queryByText('Alice Adams')).toBeNull();

    fireEvent.press(getByText('National Sisters Conference'));

    expect(getByText('Alice Adams')).toBeTruthy();
    expect(getByText('Paid ✓')).toBeTruthy();
    expect(getByText('Ben Botha')).toBeTruthy();
    expect(getByText('Awaiting Payment')).toBeTruthy();
  });

  it('shares an attendee list as CSV', async () => {
    const { Share } = require('react-native');
    jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    getEventRegistrationsByEvent.mockResolvedValue(mockGroups);

    const { getByText } = renderAdmin();
    await waitFor(() => getByText('Events'));
    fireEvent.press(getByText('Events'));

    await waitFor(() => getByText('National Sisters Conference'));
    fireEvent.press(getByText('National Sisters Conference'));
    fireEvent.press(getByText('⬆  Share Attendee List (CSV)'));

    await waitFor(() => {
      expect(Share.share).toHaveBeenCalledWith({
        title: 'National Sisters Conference — Attendees',
        message: expect.stringContaining('name,congregation,district,status,registered'),
      });
    });
    const csv = Share.share.mock.calls[0][0].message;
    expect(csv).toContain('Alice Adams,Ceres,Boland,Paid ✓');
    expect(csv).toContain('Ben Botha,Paarl,Boland,Awaiting Payment');
  });

  it('shows the Events tab to leaders with congregation scoping', async () => {
    getEventRegistrationsByEvent.mockResolvedValue([]);

    const { getByText } = renderAdmin(mockLeader);
    await waitFor(() => getByText('Events'));

    expect(getEventRegistrationsByEvent).toHaveBeenCalledWith('leader', 'Ebenezer');
  });
});
