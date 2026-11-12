import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';
import NotificationBadge from '../../components/NotificationBadge';

describe('NotificationBadge', () => {
  afterEach(() => jest.restoreAllMocks());

  it('renders nothing when there is nothing unread', () => {
    const { toJSON } = render(<NotificationBadge count={0} />);
    expect(toJSON()).toBeNull();
  });

  it('shows the count', () => {
    const { getByText } = render(<NotificationBadge count={3} />);
    expect(getByText('3', { includeHiddenElements: true })).toBeTruthy();
  });

  it('caps the count at 9+', () => {
    const { getByText, queryByText } = render(<NotificationBadge count={12} />);
    expect(getByText('9+', { includeHiddenElements: true })).toBeTruthy();
    expect(queryByText('12', { includeHiddenElements: true })).toBeNull();
  });

  it('pulses when asked to', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    const { getByTestId } = render(<NotificationBadge count={2} pulse />);
    await waitFor(() => expect(getByTestId('badge-pulse', { includeHiddenElements: true })).toBeTruthy());
  });

  it('does not render the pulse ring unless asked', () => {
    const { queryByTestId } = render(<NotificationBadge count={2} />);
    expect(queryByTestId('badge-pulse', { includeHiddenElements: true })).toBeNull();
  });

  it('does not start the animation for someone who reduces motion', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const loop = jest.spyOn(require('react-native').Animated, 'loop');

    render(<NotificationBadge count={2} pulse />);
    await waitFor(() => expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled());
    await Promise.resolve();

    expect(loop).not.toHaveBeenCalled();
  });

  it('is hidden from screen readers, because the control it sits on carries the label', () => {
    const { toJSON } = render(<NotificationBadge count={2} />);
    expect(toJSON().props.accessibilityElementsHidden).toBe(true);
  });
});
