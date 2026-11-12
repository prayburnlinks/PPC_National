import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import UnreadBanner from '../../components/UnreadBanner';

const latest = { id: 'n1', title: 'Payment Approved', body: 'You are registered & paid!' };

describe('UnreadBanner', () => {
  it('renders nothing when nothing is unread', () => {
    const { toJSON } = render(<UnreadBanner count={0} latest={null} onPress={jest.fn()} />);
    expect(toJSON()).toBeNull();
  });

  it('says how many are waiting and previews the latest', () => {
    const { getByText } = render(<UnreadBanner count={3} latest={latest} onPress={jest.fn()} />);
    expect(getByText('3 new notifications')).toBeTruthy();
    expect(getByText('Payment Approved · You are registered & paid!')).toBeTruthy();
  });

  it('uses the singular for one', () => {
    const { getByText } = render(<UnreadBanner count={1} latest={latest} onPress={jest.fn()} />);
    expect(getByText('1 new notification')).toBeTruthy();
  });

  it('caps a long count at 9+ in the circle but still states the real number', () => {
    const { getByText } = render(<UnreadBanner count={14} latest={latest} onPress={jest.fn()} />);
    expect(getByText('9+')).toBeTruthy();
    expect(getByText('14 new notifications')).toBeTruthy();
  });

  it('copes without a latest notification to preview', () => {
    const { getByText, queryByText } = render(<UnreadBanner count={2} latest={null} onPress={jest.fn()} />);
    expect(getByText('2 new notifications')).toBeTruthy();
    expect(queryByText(/·/)).toBeNull();
  });

  it('opens the notifications when pressed', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(<UnreadBanner count={2} latest={latest} onPress={onPress} />);

    fireEvent.press(getByLabelText('2 new notifications. Latest: Payment Approved'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
