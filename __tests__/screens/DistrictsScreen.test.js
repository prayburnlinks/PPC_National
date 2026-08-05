import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import DistrictsScreen from '../../screens/DistrictsScreen';

const renderScreen = () => {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  const utils = render(<DistrictsScreen navigation={navigation} />);
  return { ...utils, navigation };
};

describe('DistrictsScreen', () => {
  // DIST-01
  it('expands a district row to show its board and congregations', () => {
    const { getByText } = renderScreen();

    fireEvent.press(getByText('Boland'));

    expect(getByText('DISTRICT BOARD')).toBeTruthy();
    expect(getByText('CONGREGATIONS')).toBeTruthy();
    expect(getByText('Ceres')).toBeTruthy();
  });

  // DIST-02
  it('collapses the district again on a second tap', () => {
    const { getByText, queryByText } = renderScreen();

    fireEvent.press(getByText('Boland'));
    expect(getByText('DISTRICT BOARD')).toBeTruthy();

    fireEvent.press(getByText('Boland'));
    expect(queryByText('DISTRICT BOARD')).toBeNull();
  });

  // DIST-03
  it('renders unassigned board roles as TBA', () => {
    const { getByText, getAllByText } = renderScreen();

    // Boland's board is fully unassigned in config
    fireEvent.press(getByText('Boland'));

    expect(getAllByText('TBA')).toHaveLength(4);
    expect(getByText('Chairperson')).toBeTruthy();
    expect(getByText('Treasurer')).toBeTruthy();
  });

  // DIST-04 / DIST-06
  it('navigates to the national boards', () => {
    const { getByText, navigation } = renderScreen();

    fireEvent.press(getByText('National Board'));
    expect(navigation.navigate).toHaveBeenCalledWith('NationalBoard');

    fireEvent.press(getByText("National Women's Board"));
    expect(navigation.navigate).toHaveBeenCalledWith('NationalWomensBoard');

    fireEvent.press(getByText('National Youth Board'));
    expect(navigation.navigate).toHaveBeenCalledWith('NationalYouthBoard');

    fireEvent.press(getByText('National Sunday School Board'));
    expect(navigation.navigate).toHaveBeenCalledWith('NationalSundaySchoolBoard');
  });
});
