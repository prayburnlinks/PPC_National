import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import NotificationToast, { TOAST_VISIBLE_MS } from '../../components/NotificationToast';
import NotificationToastHost from '../../components/NotificationToastHost';
import { NotificationsContext } from '../../context/NotificationsContext';

const notification = { id: 'n1', type: 'event_reminder', title: 'Upcoming Event', body: 'Annual Conference is coming up.' };

describe('NotificationToast', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('shows the title and message', () => {
    const { getByText } = render(<NotificationToast notification={notification} onPress={jest.fn()} onDismiss={jest.fn()} />);
    expect(getByText('Upcoming Event')).toBeTruthy();
    expect(getByText('Annual Conference is coming up.')).toBeTruthy();
  });

  it('opens the notifications when tapped', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(<NotificationToast notification={notification} onPress={onPress} onDismiss={jest.fn()} />);

    fireEvent.press(getByLabelText(/New notification\. Upcoming Event/));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('goes away on its own after a few seconds', () => {
    const onDismiss = jest.fn();
    render(<NotificationToast notification={notification} onPress={jest.fn()} onDismiss={onDismiss} />);

    act(() => { jest.advanceTimersByTime(TOAST_VISIBLE_MS - 100); });
    expect(onDismiss).not.toHaveBeenCalled();

    // The timer starts the slide-out, which calls back once it has finished.
    act(() => { jest.advanceTimersByTime(100); });
    act(() => { jest.advanceTimersByTime(1000); });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not dismiss later if it was removed first', () => {
    const onDismiss = jest.fn();
    const { unmount } = render(<NotificationToast notification={notification} onPress={jest.fn()} onDismiss={onDismiss} />);
    unmount();

    act(() => { jest.advanceTimersByTime(TOAST_VISIBLE_MS + 2000); });

    expect(onDismiss).not.toHaveBeenCalled();
  });
});

describe('NotificationToastHost', () => {
  const makeRef = (routeName, ready = true) => ({
    isReady: () => ready,
    getCurrentRoute: () => ({ name: routeName }),
    navigate: jest.fn(),
  });

  const renderHost = (navigationRef, toast, dismissToast = jest.fn()) =>
    render(
      <NotificationsContext.Provider
        value={{ notifications: [], unreadCount: 1, latestUnread: toast, loaded: true, toast, dismissToast }}
      >
        <NotificationToastHost navigationRef={navigationRef} />
      </NotificationsContext.Provider>
    );

  it('shows nothing when there is no toast', () => {
    const { toJSON } = renderHost(makeRef('Home'), null);
    expect(toJSON()).toBeNull();
  });

  it('shows a new notification and takes the member to Notifications when tapped', () => {
    const ref = makeRef('Home');
    const dismissToast = jest.fn();
    const { getByLabelText } = renderHost(ref, notification, dismissToast);

    fireEvent.press(getByLabelText(/New notification\. Upcoming Event/));

    expect(dismissToast).toHaveBeenCalled();
    expect(ref.navigate).toHaveBeenCalledWith('Notifications');
  });

  it('stays out of the way on the Notifications screen, where the new card appears in the list', () => {
    const dismissToast = jest.fn();
    const { queryByText } = renderHost(makeRef('Notifications'), notification, dismissToast);

    expect(queryByText('Upcoming Event')).toBeNull();
    expect(dismissToast).toHaveBeenCalled();
  });
});
