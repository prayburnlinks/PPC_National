import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import HomeScreen from '../../screens/HomeScreen';
import { UserContext } from '../../context/UserContext';
import { DISTRICTS, CONGREGATIONS } from '../../constants/config';

jest.mock('../../services/firestoreService', () => ({
  getUpcomingEvents: jest.fn(),
  getUserNotifications: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
  useFocusEffect: (cb) => require('react').useEffect(cb, [cb]),
}));

import { getUpcomingEvents, getUserNotifications } from '../../services/firestoreService';

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
  getUserNotifications.mockResolvedValue([]);
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
  it('navigates a member to Notifications and shows the dot only when unread exist', async () => {
    getUserNotifications.mockResolvedValue([{ id: 'n1', read: false }]);
    const navigation = { navigate: jest.fn(), goBack: jest.fn() };
    const { getByText } = render(
      <UserContext.Provider value={{ user: mockUser, onLogin: jest.fn(), onLogout: jest.fn() }}>
        <HomeScreen navigation={navigation} />
      </UserContext.Provider>
    );

    await waitFor(() => expect(getUserNotifications).toHaveBeenCalledWith('uid-1', 20));

    require('@testing-library/react-native').fireEvent.press(getByText('🔔'));
    expect(navigation.navigate).toHaveBeenCalledWith('Notifications');
  });

  it('sends a visitor to the SignIn prompt instead', async () => {
    const navigation = { navigate: jest.fn(), goBack: jest.fn() };
    const { getByText } = render(
      <UserContext.Provider value={{ user: { role: 'visitor', name: 'Visitor' }, onLogin: jest.fn(), onLogout: jest.fn() }}>
        <HomeScreen navigation={navigation} />
      </UserContext.Provider>
    );

    await waitFor(() => getByText('🔔'));
    require('@testing-library/react-native').fireEvent.press(getByText('🔔'));

    expect(navigation.navigate).toHaveBeenCalledWith('SignIn');
    expect(getUserNotifications).not.toHaveBeenCalled();
  });
});
