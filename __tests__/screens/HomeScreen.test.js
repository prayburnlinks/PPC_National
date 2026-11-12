import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import HomeScreen from '../../screens/HomeScreen';
import { UserContext } from '../../context/UserContext';
import { NotificationsContext } from '../../context/NotificationsContext';
import { DISTRICTS, CONGREGATIONS } from '../../constants/config';

jest.mock('../../services/firestoreService', () => ({
  getUpcomingEvents: jest.fn(),
  getLiveStatus: jest.fn(),
  subscribeToNotifications: jest.fn(),
}));

jest.mock('../../services/pushNotificationService', () => ({
  setAppIconBadge: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
  useFocusEffect: (cb) => require('react').useEffect(cb, [cb]),
}));

import { getUpcomingEvents, getLiveStatus } from '../../services/firestoreService';

const mockUser = {
  uid: 'uid-1',
  name: 'Prayburn',
  role: 'member',
  status: 'approved',
};

const renderHome = (user = mockUser) => {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  return render(
    <UserContext.Provider value={{ user, onLogin: jest.fn(), onLogout: jest.fn() }}>
      <HomeScreen navigation={navigation} />
    </UserContext.Provider>
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  getUpcomingEvents.mockResolvedValue([]);
  getLiveStatus.mockResolvedValue({ isLive: false, title: '' });
});

describe('HomeScreen rendering', () => {
  it('renders without crashing', async () => {
    const { getByText } = renderHome();
    await waitFor(() => {
      expect(getByText('I Love My Church')).toBeTruthy();
    });
  });

  it('shows a greeting', async () => {
    const { getByText } = renderHome();
    await waitFor(() => {
      expect(getByText(/Good (morning|afternoon|evening), beloved/i)).toBeTruthy();
    });
  });

  it('shows the correct number of districts and congregations', async () => {
    const { getByText } = renderHome();
    const expectedLabel = `${DISTRICTS.length} districts · ${CONGREGATIONS.length} congs`;
    await waitFor(() => {
      expect(getByText(expectedLabel)).toBeTruthy();
    });
  });

  it('shows the current release presentation badge', async () => {
    const { getByText } = renderHome();
    await waitFor(() => {
      expect(getByText(/Current release/i)).toBeTruthy();
    });
  });
});

describe('HomeScreen live status', () => {
  it('shows Watch and no LIVE badge when nothing is live', async () => {
    const { getByText, queryByText } = renderHome();
    await waitFor(() => expect(getByText('Watch')).toBeTruthy());
    expect(getByText('Watch our services')).toBeTruthy();
    expect(queryByText('LIVE')).toBeNull();
  });

  it('shows Live Now and the stream title when actually live', async () => {
    getLiveStatus.mockResolvedValue({ isLive: true, title: 'Sunday Morning Service' });
    const { getByText, getAllByText } = renderHome();
    await waitFor(() => expect(getByText('Live Now')).toBeTruthy());
    expect(getByText('Sunday Morning Service')).toBeTruthy();
    expect(getAllByText('LIVE').length).toBeGreaterThan(0);
  });
});

describe('HomeScreen events', () => {
  it('shows a loading indicator initially', () => {
    getUpcomingEvents.mockReturnValue(new Promise(() => {}));
    const { getByTestId, queryByTestId } = renderHome();
    // loading state renders an ActivityIndicator
    // We check that the events list is not yet shown
    expect(queryByTestId && queryByTestId('events-list')).toBeFalsy();
  });

  it('renders upcoming events after loading', async () => {
    getUpcomingEvents.mockResolvedValue([
      {
        id: 'e1',
        name: 'Youth Camp',
        eventDate: new Date(Date.now() + 86400000),
        venue: 'Cape Town',
        category: 'Youth',
      },
    ]);

    const { getByText } = renderHome();

    await waitFor(() => {
      expect(getByText('Youth Camp')).toBeTruthy();
    });
  });

  it('shows empty state when no upcoming events', async () => {
    getUpcomingEvents.mockResolvedValue([]);

    const { getByText } = renderHome();

    await waitFor(() => {
      expect(getByText(/No upcoming events/i)).toBeTruthy();
    });
  });
});

describe('HomeScreen notification bell', () => {
  const renderWithFeed = (feed, user = mockUser) => {
    const navigation = { navigate: jest.fn(), goBack: jest.fn() };
    const utils = render(
      <UserContext.Provider value={{ user, onLogin: jest.fn(), onLogout: jest.fn() }}>
        <NotificationsContext.Provider
          value={{ notifications: [], unreadCount: 0, latestUnread: null, loaded: true, toast: null, dismissToast: jest.fn(), ...feed }}
        >
          <HomeScreen navigation={navigation} />
        </NotificationsContext.Provider>
      </UserContext.Provider>
    );
    return { ...utils, navigation };
  };

  const latestUnread = { id: 'n1', title: 'Payment Approved', body: 'You are registered & paid!', read: false };

  it('takes a member to Notifications when the bell is tapped', async () => {
    const { getByText, navigation } = renderWithFeed({});
    await waitFor(() => getByText('🔔'));

    fireEvent.press(getByText('🔔'));

    expect(navigation.navigate).toHaveBeenCalledWith('Notifications');
  });

  it('shows no badge and no banner when nothing is unread', async () => {
    const { getByText, queryByText, queryByLabelText } = renderWithFeed({});
    await waitFor(() => getByText('🔔'));

    expect(queryByText(/new notification/i)).toBeNull();
    expect(queryByLabelText(/unread/i)).toBeNull();
  });

  it('puts the unread count on the bell and says so to screen readers', async () => {
    const { getByText, getAllByText, getByLabelText } = renderWithFeed({ unreadCount: 3, latestUnread });
    await waitFor(() => getByText('🔔'));

    expect(getByLabelText('Notifications, 3 unread')).toBeTruthy();
    // The count appears on the bell (hidden from screen readers, since the
    // bell's own label already says it) and again in the banner.
    expect(getAllByText('3', { includeHiddenElements: true })).toHaveLength(2);
  });

  it('shows the banner with the latest unread notification, and opens Notifications from it', async () => {
    const { getByText, getByLabelText, navigation } = renderWithFeed({ unreadCount: 2, latestUnread });
    await waitFor(() => getByText('2 new notifications'));

    expect(getByText('Payment Approved · You are registered & paid!')).toBeTruthy();

    fireEvent.press(getByLabelText('2 new notifications. Latest: Payment Approved'));
    expect(navigation.navigate).toHaveBeenCalledWith('Notifications');
  });

  it('uses the singular for a single unread notification', async () => {
    const { getByText } = renderWithFeed({ unreadCount: 1, latestUnread });
    await waitFor(() => getByText('1 new notification'));
  });

  it('sends a visitor to the SignIn prompt instead', async () => {
    const { getByText, navigation } = renderWithFeed({}, { role: 'visitor', name: 'Visitor' });
    await waitFor(() => getByText('🔔'));

    fireEvent.press(getByText('🔔'));

    expect(navigation.navigate).toHaveBeenCalledWith('SignIn');
  });
});
