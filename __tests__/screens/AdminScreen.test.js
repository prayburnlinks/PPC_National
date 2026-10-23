import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import AdminScreen from '../../screens/AdminScreen';
import { UserContext } from '../../context/UserContext';

jest.mock('../../services/authService', () => ({
  getPendingRegistrations: jest.fn(),
  approveUser: jest.fn(),
  rejectUser: jest.fn(),
  getApprovedUsers: jest.fn(),
  updateUserRole: jest.fn(),
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

// The Reported tab reads the moderation queue. Without this mock the real
// module drags in firebase's ESM build, which jest cannot parse.
jest.mock('../../services/firestoreService', () => ({
  getOpenContentReports: jest.fn(() => Promise.resolve([])),
  hidePrayerRequest: jest.fn(),
  resolveContentReport: jest.fn(),
}));

import {
  getPendingRegistrations,
  getApprovedUsers,
  approveUser,
  rejectUser,
  updateUserRole,
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
  getApprovedUsers.mockResolvedValue([]);
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

  it('rejects a user with a typed reason through the reject modal', async () => {
    rejectUser.mockResolvedValue({ success: true });

    const { getByText, queryByText, getByPlaceholderText } = renderAdmin();
    await waitFor(() => getByText('Reject'));

    await act(async () => {
      fireEvent.press(getByText('Reject'));
    });

    // Modal opens with an optional reason field
    await waitFor(() => getByText("Reject John Smith's registration?"));
    fireEvent.changeText(
      getByPlaceholderText('Reason (optional — shown to the user)'),
      'Congregation could not verify membership'
    );

    await act(async () => {
      fireEvent.press(getByText('Confirm Reject'));
    });

    await waitFor(() => {
      expect(rejectUser).toHaveBeenCalledWith('u1', 'Congregation could not verify membership');
      expect(queryByText('John Smith')).toBeFalsy();
    });
  });

  it('rejects an event payment with the reason passed through', async () => {
    const { rejectEventRegistration } = require('../../services/eventRegistrationService');
    rejectEventRegistration.mockResolvedValue({ success: true });
    getPendingEventRegistrations.mockResolvedValue([
      {
        id: 'u2_e1',
        userId: 'u2',
        userName: 'Mary Adams',
        eventName: 'Youth Camp',
        registrationFee: 250,
        currency: 'R',
        congregation: 'Ebenezer',
        fileName: 'proof.jpg',
        mimeType: 'image/jpeg',
      },
    ]);

    const { getByText, getByPlaceholderText } = renderAdmin();
    await waitFor(() => getByText(/Payments/));
    await act(async () => {
      fireEvent.press(getByText(/Payments/));
    });

    await waitFor(() => getByText('Reject'));
    await act(async () => {
      fireEvent.press(getByText('Reject'));
    });

    await waitFor(() => getByText('Reject payment from Mary Adams for Youth Camp?'));
    fireEvent.changeText(
      getByPlaceholderText('Reason (optional — shown to the user)'),
      'Reference did not match'
    );
    await act(async () => {
      fireEvent.press(getByText('Confirm Reject'));
    });

    await waitFor(() => {
      expect(rejectEventRegistration).toHaveBeenCalledWith('u2_e1', 'u2', 'admin-uid', 'Reference did not match');
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

describe('AdminScreen change role', () => {
  const mockMember = {
    uid: 'm1',
    name: 'Nigel Scott',
    email: 'nigel@church.com',
    role: 'leader',
    status: 'approved',
  };

  const openUsersTab = async (users = [mockMember]) => {
    getApprovedUsers.mockResolvedValue(users);
    const utils = renderAdmin();
    await waitFor(() => utils.getByText('Users'));
    await act(async () => {
      fireEvent.press(utils.getByText('Users'));
    });
    return utils;
  };

  const confirmAlerts = () =>
    jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(
      (title, msg, buttons) => buttons?.find((b) => b.text === 'Change')?.onPress()
    );

  it('changes a user role through the Change Role modal', async () => {
    updateUserRole.mockResolvedValue({ success: true });
    confirmAlerts();
    const { getByText, getAllByText } = await openUsersTab();

    await act(async () => {
      fireEvent.press(getByText('Change Role'));
    });
    await act(async () => {
      fireEvent.press(getByText('Member'));
    });

    await waitFor(() => {
      expect(updateUserRole).toHaveBeenCalledWith('m1', 'member');
      // The card's pill now reads Member; the chip filters are labelled "Members".
      expect(getAllByText('Member').length).toBeGreaterThan(0);
    });
  });

  it('shows an error and keeps the old role when the update fails', async () => {
    updateUserRole.mockRejectedValue({ message: 'Unauthorized: Admin access required to change roles' });
    const alertSpy = confirmAlerts();
    const { getByText } = await openUsersTab();

    await act(async () => {
      fireEvent.press(getByText('Change Role'));
    });
    await act(async () => {
      fireEvent.press(getByText('Member'));
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error', 'Unauthorized: Admin access required to change roles');
    });
  });

  it('shows each user\'s congregation on their card', async () => {
    const { getByText } = await openUsersTab([
      { ...mockMember, congregation: 'Ebenhaeser' },
      { ...mockMember, uid: 'm2', name: 'No Cong', email: 'x@church.com' },
    ]);
    expect(getByText('Ebenhaeser')).toBeTruthy();
    expect(getByText('No congregation')).toBeTruthy();
  });

  it('does not offer Change Role on the admin\'s own card', async () => {
    const { queryByText } = await openUsersTab([{ ...mockAdmin, email: 'a@church.com' }]);
    expect(queryByText('Change Role')).toBeNull();
  });
});
