import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ImageViewerModal from '../../components/ImageViewerModal';

const renderViewer = (props = {}) =>
  render(
    <ImageViewerModal visible uri="https://example.com/photo.jpg" title="Camp Photo" onClose={jest.fn()} {...props} />
  );

describe('ImageViewerModal', () => {
  it('shows nothing while closed', () => {
    const { queryByText } = renderViewer({ visible: false });
    expect(queryByText('Camp Photo')).toBeNull();
  });

  it('shows the title and the picture', () => {
    const { getByText, getByLabelText } = renderViewer();
    expect(getByText('Camp Photo')).toBeTruthy();
    expect(getByLabelText('Camp Photo').props.source).toEqual({ uri: 'https://example.com/photo.jpg' });
  });

  it('closes from the Close button', () => {
    const onClose = jest.fn();
    const { getByLabelText } = renderViewer({ onClose });
    fireEvent.press(getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows a spinner until the picture has loaded', () => {
    const { getByLabelText, UNSAFE_queryByType } = renderViewer();
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_queryByType(ActivityIndicator)).not.toBeNull();

    fireEvent(getByLabelText('Camp Photo'), 'load');

    expect(UNSAFE_queryByType(ActivityIndicator)).toBeNull();
  });

  it('says so when the picture cannot be loaded', () => {
    const { getByLabelText, getByText, queryByLabelText } = renderViewer();

    fireEvent(getByLabelText('Camp Photo'), 'error');

    expect(getByText("This image couldn't be loaded")).toBeTruthy();
    expect(queryByLabelText('Camp Photo')).toBeNull();
    // Close still works so the member is never stuck.
    expect(getByLabelText('Close')).toBeTruthy();
  });

  it('starts again from loading when a different picture is shown', () => {
    const { getByLabelText, rerender } = renderViewer();
    fireEvent(getByLabelText('Camp Photo'), 'error');

    rerender(
      <ImageViewerModal visible uri="https://example.com/other.jpg" title="Other" onClose={jest.fn()} />
    );

    expect(getByLabelText('Other')).toBeTruthy();
  });
});
