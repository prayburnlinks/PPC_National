import React from 'react';
import { Text } from 'react-native';
import { render, act } from '@testing-library/react-native';
import { NotificationsProvider, useNotifications, TOAST_WINDOW_MS } from '../../context/NotificationsContext';
import { UserContext } from '../../context/UserContext';
import { subscribeToNotifications } from '../../services/firestoreService';

jest.mock('../../services/firestoreService', () => ({
  subscribeToNotifications: jest.fn(),
}));

const member = { uid: 'uid-1', role: 'member' };

// Renders a provider and hands back what a screen would read from it.
let latest;
const Probe = () => {
  latest = useNotifications();
  return <Text>probe</Text>;
};

const renderFeed = (user = member) =>
  render(
    <UserContext.Provider value={{ user, onLogin: jest.fn(), onLogout: jest.fn() }}>
      <NotificationsProvider>
        <Probe />
      </NotificationsProvider>
    </UserContext.Provider>
  );

const note = (id, overrides = {}) => ({
  id,
  title: `Title ${id}`,
  body: `Body ${id}`,
  type: 'announcement',
  read: false,
  createdAt: new Date(),
  ...overrides,
});

// What subscribeToNotifications was given, so a test can play the part of Firestore.
let emit;
let unsubscribe;

beforeEach(() => {
  jest.clearAllMocks();
  latest = undefined;
  unsubscribe = jest.fn();
  subscribeToNotifications.mockImplementation((uid, onChange, onError) => {
    emit = (payload) => act(() => onChange(payload));
    emit.fail = () => act(() => onError(new Error('permission-denied')));
    return unsubscribe;
  });
});

describe('NotificationsProvider', () => {
  it('listens to the signed-in member’s feed', () => {
    renderFeed();
    expect(subscribeToNotifications).toHaveBeenCalledWith('uid-1', expect.any(Function), expect.any(Function));
  });

  it('does not listen for a visitor or when signed out', () => {
    renderFeed({ role: 'visitor', name: 'Visitor' });
    renderFeed(null);
    expect(subscribeToNotifications).not.toHaveBeenCalled();
    expect(latest.unreadCount).toBe(0);
  });

  it('counts unread across the whole feed and exposes the newest unread', () => {
    renderFeed();
    expect(latest.loaded).toBe(false);

    emit({
      notifications: [note('n3'), note('n2', { read: true }), note('n1')],
      addedIds: ['n3', 'n2', 'n1'],
    });

    expect(latest.loaded).toBe(true);
    expect(latest.unreadCount).toBe(2);
    expect(latest.latestUnread.id).toBe('n3');
    expect(latest.unreadIds).toEqual(['n3', 'n1']);
    expect(latest.notifications.map((n) => n.id)).toEqual(['n3', 'n2', 'n1']);
  });

  it('keeps only the newest 50 in the list but still counts older unread ones', () => {
    renderFeed();
    const feed = Array.from({ length: 60 }, (_, i) => note(`n${i}`));

    emit({ notifications: feed, addedIds: [] });

    expect(latest.notifications).toHaveLength(50);
    expect(latest.unreadCount).toBe(60);
    expect(latest.unreadIds).toHaveLength(60);
  });

  describe('toast', () => {
    it('does not toast what was already in the feed when it first loads', () => {
      renderFeed();
      emit({ notifications: [note('n1')], addedIds: ['n1'] });
      expect(latest.toast).toBeNull();
    });

    it('toasts a fresh unread notification that arrives afterwards', () => {
      renderFeed();
      emit({ notifications: [note('n1', { read: true })], addedIds: ['n1'] });

      emit({ notifications: [note('n2'), note('n1', { read: true })], addedIds: ['n2'] });

      expect(latest.toast.id).toBe('n2');
      expect(latest.unreadCount).toBe(1);
    });

    it('toasts only the newest when several arrive together', () => {
      renderFeed();
      emit({ notifications: [], addedIds: [] });

      emit({ notifications: [note('n2'), note('n1')], addedIds: ['n1', 'n2'] });

      expect(latest.toast.id).toBe('n2');
    });

    it('does not toast an old notification that only just reached this phone', () => {
      renderFeed();
      emit({ notifications: [], addedIds: [] });
      const stale = note('n1', { createdAt: new Date(Date.now() - TOAST_WINDOW_MS - 60 * 1000) });

      emit({ notifications: [stale], addedIds: ['n1'] });

      expect(latest.toast).toBeNull();
      expect(latest.unreadCount).toBe(1);
    });

    it('does not toast for a change to something already there, or for one already read', () => {
      renderFeed();
      emit({ notifications: [note('n1')], addedIds: [] });

      // n1 is marked read: a change, not an arrival.
      emit({ notifications: [note('n1', { read: true })], addedIds: [] });
      // Added, but already read.
      emit({ notifications: [note('n2', { read: true }), note('n1', { read: true })], addedIds: ['n2'] });

      expect(latest.toast).toBeNull();
    });

    it('clears when dismissed', () => {
      renderFeed();
      emit({ notifications: [], addedIds: [] });
      emit({ notifications: [note('n1')], addedIds: ['n1'] });
      expect(latest.toast).not.toBeNull();

      act(() => latest.dismissToast());

      expect(latest.toast).toBeNull();
    });
  });

  it('shows the empty list rather than a spinner when the feed cannot be read', () => {
    renderFeed();
    emit.fail();
    expect(latest.loaded).toBe(true);
    expect(latest.notifications).toEqual([]);
  });

  it('stops listening when the member goes away', () => {
    const { unmount } = renderFeed();
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
