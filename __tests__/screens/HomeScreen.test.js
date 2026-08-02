import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import HomeScreen from '../../screens/HomeScreen';
import { UserContext } from '../../context/UserContext';
import { DISTRICTS, CONGREGATIONS } from '../../constants/config';

jest.mock('../../services/firestoreService', () => ({
  getUpcomingEvents: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
}));

import { getUpcomingEvents } from '../../services/firestoreService';

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
