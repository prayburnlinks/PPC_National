import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import PrayerWallScreen from '../../screens/PrayerWallScreen';
import { UserContext } from '../../context/UserContext';

jest.mock('../../services/firestoreService', () => ({
  getPrayerRequests: jest.fn(),
  submitPrayerRequest: jest.fn(),
  prayForRequest: jest.fn(),
}));

import {
  getPrayerRequests,
  submitPrayerRequest,
  prayForRequest,
} from '../../services/firestoreService';

const mockMember = {
  uid: 'uid-1',
  name: 'Alice',
  role: 'member',
  district: 'Southern Cape',
};

const mockRequests = [
  { id: 'req-1', title: 'Pray for healing', body: 'My father is ill', prayCount: 3, createdAt: new Date() },
  { id: 'req-2', title: 'Job request', body: 'Looking for work', prayCount: 7, createdAt: new Date() },
];

const renderPrayerWall = (user = mockMember) => {
  return render(
    <UserContext.Provider value={{ user, onLogin: jest.fn(), onLogout: jest.fn() }}>
      <PrayerWallScreen />
    </UserContext.Provider>
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  getPrayerRequests.mockResolvedValue(mockRequests);
});

describe('PrayerWallScreen rendering', () => {
  it('renders the Prayer Wall title', async () => {
    const { getByText } = renderPrayerWall();
    await waitFor(() => {
      expect(getByText('Prayer Wall')).toBeTruthy();
    });
  });

  it('shows National and District scope toggles', async () => {
    const { getByText } = renderPrayerWall();
    await waitFor(() => {
      expect(getByText('National')).toBeTruthy();
      expect(getByText('District')).toBeTruthy();
    });
  });

  it('renders prayer requests after loading', async () => {
    const { getByText } = renderPrayerWall();
    await waitFor(() => {
      expect(getByText('Pray for healing')).toBeTruthy();
      expect(getByText('Job request')).toBeTruthy();
    });
  });

  it('shows empty state when no requests', async () => {
    getPrayerRequests.mockResolvedValue([]);
    const { getByText } = renderPrayerWall();
    await waitFor(() => {
      expect(getByText(/No prayer requests yet/i)).toBeTruthy();
    });
  });
});

describe('PrayerWallScreen scope toggle', () => {
  it('calls getPrayerRequests with national scope by default', async () => {
    renderPrayerWall();
    await waitFor(() => {
      expect(getPrayerRequests).toHaveBeenCalledWith('national', 'Southern Cape');
    });
  });

  it('re-fetches with district scope when District is pressed', async () => {
    const { getByText } = renderPrayerWall();
    await waitFor(() => expect(getPrayerRequests).toHaveBeenCalledTimes(1));

    await act(async () => {
      fireEvent.press(getByText('District'));
    });

    await waitFor(() => {
      expect(getPrayerRequests).toHaveBeenCalledWith('district', 'Southern Cape');
    });
  });
});

describe('PrayerWallScreen submit', () => {
  it('shows alert when body is empty', async () => {
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');
    const { getByText } = renderPrayerWall();

    await waitFor(() => getByText('Submit Request'));

    await act(async () => {
      fireEvent.press(getByText('Submit Request'));
    });

    expect(alertSpy).toHaveBeenCalled();
    expect(submitPrayerRequest).not.toHaveBeenCalled();
  });

  it('prevents visitor from submitting', async () => {
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');
    const { getByText, getByPlaceholderText } = renderPrayerWall(null);

    await waitFor(() => getByText('Submit Request'));

    fireEvent.changeText(getByPlaceholderText(/Write your prayer request/i), 'Need healing');

    await act(async () => {
      fireEvent.press(getByText('Submit Request'));
    });

    expect(alertSpy).toHaveBeenCalled();
    expect(submitPrayerRequest).not.toHaveBeenCalled();
  });

  it('submits request and reloads list on success', async () => {
    submitPrayerRequest.mockResolvedValue({ success: true, id: 'new-req' });

    const { getByText, getByPlaceholderText } = renderPrayerWall();
    await waitFor(() => getByText('Submit Request'));

    fireEvent.changeText(getByPlaceholderText(/Write your prayer request/i), 'Pray for my family');

    await act(async () => {
      fireEvent.press(getByText('Submit Request'));
    });

    expect(submitPrayerRequest).toHaveBeenCalledWith(
      'uid-1',
      expect.objectContaining({ body: 'Pray for my family' })
    );
    await waitFor(() => {
      expect(getPrayerRequests).toHaveBeenCalledTimes(2);
    });
  });
});

describe('PrayerWallScreen praying', () => {
  it('calls prayForRequest with the request id and user uid', async () => {
    prayForRequest.mockResolvedValue({ success: true, action: 'added' });

    const { getByText, getAllByText } = renderPrayerWall();
    await waitFor(() => getByText('Pray for healing'));

    fireEvent.press(getAllByText('Praying 🙏')[0]);

    await waitFor(() => {
      expect(prayForRequest).toHaveBeenCalledWith('req-1', 'uid-1');
    });
  });

  it('increments prayCount in UI when action is added', async () => {
    prayForRequest.mockResolvedValue({ success: true, action: 'added' });

    const { getByText, getAllByText, findByText } = renderPrayerWall();
    await waitFor(() => getByText('Pray for healing'));

    fireEvent.press(getAllByText('Praying 🙏')[0]);

    // prayCount for req-1 starts at 3, should become 4
    await findByText('4 praying');
  });

  it('decrements prayCount in UI when action is removed', async () => {
    prayForRequest.mockResolvedValue({ success: true, action: 'removed' });

    const { getByText, getAllByText, findByText } = renderPrayerWall();
    await waitFor(() => getByText('Pray for healing'));

    fireEvent.press(getAllByText('Praying 🙏')[0]);

    // prayCount for req-1 starts at 3, should become 2
    await findByText('2 praying');
  });

  it('shows error alert when prayForRequest fails', async () => {
    prayForRequest.mockRejectedValue({ message: 'Network error' });
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');

    const { getByText, getAllByText } = renderPrayerWall();
    await waitFor(() => getByText('Pray for healing'));

    fireEvent.press(getAllByText('Praying 🙏')[0]);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error', 'Failed to update prayer count');
    });
  });
});

describe('PrayerWallScreen double-submit guards', () => {
  it('replaces the submit button with a spinner while in flight and only submits once', async () => {
    let resolveSubmit;
    submitPrayerRequest.mockReturnValue(new Promise((resolve) => { resolveSubmit = resolve; }));

    const { getByText, queryByText, getByPlaceholderText } = renderPrayerWall();
    await waitFor(() => getByText('Submit Request'));

    fireEvent.changeText(getByPlaceholderText(/Write your prayer request/i), 'Pray for my family');

    await act(async () => {
      fireEvent.press(getByText('Submit Request'));
    });

    // Button is swapped for a spinner while submitting — it can't be tapped again
    expect(queryByText('Submit Request')).toBeFalsy();
    expect(submitPrayerRequest).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSubmit({ success: true, id: 'new-req' });
    });

    await waitFor(() => expect(getByText('Submit Request')).toBeTruthy());
  });

  it('does not call prayForRequest twice for the same request when tapped rapidly', async () => {
    let resolvePray;
    prayForRequest.mockReturnValue(new Promise((resolve) => { resolvePray = resolve; }));

    const { getByText, getAllByText } = renderPrayerWall();
    await waitFor(() => getByText('Pray for healing'));

    await act(async () => {
      fireEvent.press(getAllByText('Praying 🙏')[0]);
      fireEvent.press(getAllByText('Praying 🙏')[0]);
    });

    expect(prayForRequest).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolvePray({ success: true, action: 'added' });
    });
  });
});
