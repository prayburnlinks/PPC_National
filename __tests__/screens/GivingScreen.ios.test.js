/**
 * GivingScreen (iOS only) — link-out only, per Apple Guideline 3.2.2(iv):
 * PPC National is not an approved Benevity/Candid nonprofit, so this build
 * may not select a fund/amount or show bank details in-app. Android and web
 * keep the original in-app flow (GivingScreen.js, tested in
 * GivingScreen.test.js) since Google Play has no equivalent restriction.
 * Explicitly importing the .ios.js file keeps this test pinned to the iOS
 * version regardless of which platform the test runner defaults to.
 */

import React from 'react';
import { Linking, Alert } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import GivingScreen from '../../screens/GivingScreen.ios.js';

const renderGiving = () => render(<GivingScreen />);

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Linking, 'openURL').mockResolvedValue();
});

describe('GivingScreen', () => {
  // Apple Guideline 3.2.2(iv) — the app must not collect charitable
  // donations in-app unless the org is an approved Benevity/Candid
  // nonprofit. These assert the removed flow never comes back.
  it('renders fund names as information only, not selectable amounts', () => {
    const { getByText, queryByText } = renderGiving();

    expect(getByText('Tithes & Offerings')).toBeTruthy();
    expect(getByText('Building Fund')).toBeTruthy();
    expect(queryByText('Amount (ZAR)')).toBeNull();
    expect(queryByText('R100')).toBeNull();
    expect(queryByText('Other')).toBeNull();
  });

  it('never shows bank details in-app', () => {
    const { queryByText } = renderGiving();

    expect(queryByText('EFT Banking Details')).toBeNull();
    expect(queryByText('4056725472')).toBeNull();
  });

  it('opens the giving web page in the browser when Give Now is tapped', () => {
    const { getByText } = renderGiving();

    fireEvent.press(getByText(/Give Now/));

    expect(Linking.openURL).toHaveBeenCalledWith('https://ppc-national-church.web.app/give.html');
  });

  it('tells the user where to go if the link fails to open', async () => {
    Linking.openURL.mockRejectedValue(new Error('no browser'));
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByText } = renderGiving();

    fireEvent.press(getByText(/Give Now/));
    await Promise.resolve().then(() => Promise.resolve());

    expect(alertSpy).toHaveBeenCalledWith(
      'Could not open link',
      expect.stringContaining('ppc-national-church.web.app/give.html')
    );
    alertSpy.mockRestore();
  });
});
