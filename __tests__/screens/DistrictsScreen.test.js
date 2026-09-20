import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor, act, within } from '@testing-library/react-native';
import DistrictsScreen from '../../screens/DistrictsScreen';
import { UserContext } from '../../context/UserContext';
import { CONGREGATIONS } from '../../constants/config';

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn(),
  writeBatch: jest.fn(),
  serverTimestamp: jest.fn(),
}));

jest.mock('../../services/districtsService', () => ({
  ...jest.requireActual('../../services/districtsService'),
  getDistrictDetails: jest.fn(),
  saveDistrictDetails: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb) => require('react').useEffect(cb, [cb]),
}));

import { getDistrictDetails, saveDistrictDetails } from '../../services/districtsService';

const member = { uid: 'member-1', name: 'Member', role: 'member', status: 'approved' };
const leader = { ...member, uid: 'leader-1', role: 'leader' };
const admin = { uid: 'admin-1', name: 'Admin', role: 'admin', status: 'approved' };

const bolandCongregations = CONGREGATIONS.filter(c => c.district === 'Boland');

// The board and the congregation list both show TBA placeholders, so count
// each within its own section: 'district-board' or 'district-congregations'.
const tbaIn = (getByTestId, section) => within(getByTestId(section)).queryAllByText('TBA');

// Resolves once the screen has read the saved names, so tests start from a
// settled screen rather than racing the initial fetch.
const renderScreen = async (user = member) => {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  const utils = render(
    <UserContext.Provider value={{ user, onLogin: jest.fn(), onLogout: jest.fn() }}>
      <DistrictsScreen navigation={navigation} />
    </UserContext.Provider>
  );
  await act(async () => {});
  return { ...utils, navigation };
};

beforeEach(() => {
  jest.clearAllMocks();
  getDistrictDetails.mockResolvedValue({});
  saveDistrictDetails.mockResolvedValue({ success: true });
});

describe('DistrictsScreen', () => {
  // DIST-01
  it('expands a district row to show its board and congregations', async () => {
    const { getByText } = await renderScreen();

    fireEvent.press(getByText('Boland'));

    expect(getByText('DISTRICT BOARD')).toBeTruthy();
    expect(getByText('CONGREGATIONS')).toBeTruthy();
    expect(getByText('Ceres')).toBeTruthy();
  });

  // DIST-02
  it('collapses the district again on a second tap', async () => {
    const { getByText, queryByText } = await renderScreen();

    fireEvent.press(getByText('Boland'));
    expect(getByText('DISTRICT BOARD')).toBeTruthy();

    fireEvent.press(getByText('Boland'));
    expect(queryByText('DISTRICT BOARD')).toBeNull();
  });

  // DIST-03
  it('renders unassigned board roles as TBA', async () => {
    const { getByText, getByTestId } = await renderScreen();

    // Boland's board is fully unassigned in config
    fireEvent.press(getByText('Boland'));

    expect(tbaIn(getByTestId, 'district-board')).toHaveLength(4);
    expect(getByText('Chairperson')).toBeTruthy();
    expect(getByText('Treasurer')).toBeTruthy();
  });

  // DIST-04 / DIST-06
  it('navigates to the national boards', async () => {
    const { getByText, navigation } = await renderScreen();

    fireEvent.press(getByText('National Board'));
    expect(navigation.navigate).toHaveBeenCalledWith('NationalBoard');

    fireEvent.press(getByText("National Women's Board"));
    expect(navigation.navigate).toHaveBeenCalledWith('NationalWomensBoard');

    fireEvent.press(getByText('National Youth Board'));
    expect(navigation.navigate).toHaveBeenCalledWith('NationalYouthBoard');

    fireEvent.press(getByText('National Sunday School Board'));
    expect(navigation.navigate).toHaveBeenCalledWith('NationalSundaySchoolBoard');
  });

  // DIST-07
  it('shows board names an admin has saved in place of the defaults', async () => {
    getDistrictDetails.mockResolvedValue({
      boland: { board: { chairperson: 'A. Adams', deputy: 'TBA', secretary: 'TBA', treasurer: 'TBA' } },
    });
    const { getByText, getByTestId } = await renderScreen();

    fireEvent.press(getByText('Boland'));

    expect(getByText('A. Adams')).toBeTruthy();
    expect(tbaIn(getByTestId, 'district-board')).toHaveLength(3);
  });

  // DIST-16
  it('shows a TBA placeholder for every congregation that has no pastor', async () => {
    const { getByText, getByTestId } = await renderScreen();

    fireEvent.press(getByText('Boland'));

    expect(tbaIn(getByTestId, 'district-congregations')).toHaveLength(
      bolandCongregations.filter(c => !c.pastor).length
    );
  });

  // DIST-17
  it('shows a pastor an admin has saved, and leaves the rest as TBA', async () => {
    getDistrictDetails.mockResolvedValue({ boland: { pastors: { ceres: 'Ps. J. Smith' } } });
    const { getByText, getByTestId } = await renderScreen();

    fireEvent.press(getByText('Boland'));

    expect(getByText('Ps. J. Smith')).toBeTruthy();
    expect(tbaIn(getByTestId, 'district-congregations')).toHaveLength(bolandCongregations.length - 1);
    // A doc holding only pastors does not disturb the board defaults
    expect(tbaIn(getByTestId, 'district-board')).toHaveLength(4);
  });

  describe('editing names', () => {
    // DIST-08
    it.each([['member', member], ['leader', leader]])('is not offered to a %s', async (_, user) => {
      const { queryByText } = await renderScreen(user);

      expect(queryByText('Edit')).toBeNull();
    });

    // DIST-09
    it('is not offered until the saved names have loaded', async () => {
      getDistrictDetails.mockRejectedValue({ message: 'Failed to load district details.' });
      const { queryByText } = await renderScreen(admin);

      expect(queryByText('Edit')).toBeNull();
    });

    // DIST-10
    it('lets an admin change a name, save it, and see it afterwards', async () => {
      const { getByText, getByLabelText, queryByText } = await renderScreen(admin);

      fireEvent.press(getByText('Edit'));
      fireEvent.press(getByText('Boland'));

      // Unassigned roles show as an empty field with TBA as the placeholder
      const chair = getByLabelText('Boland Chairperson');
      expect(chair.props.value).toBe('');
      expect(chair.props.placeholder).toBe('TBA');

      fireEvent.changeText(chair, '  A. Adams ');
      fireEvent.press(getByText('Save'));

      await waitFor(() => expect(queryByText('Save')).toBeNull());
      expect(saveDistrictDetails).toHaveBeenCalledWith(admin, [
        {
          name: 'Boland',
          board: { chairperson: 'A. Adams', deputy: 'TBA', secretary: 'TBA', treasurer: 'TBA' },
        },
      ]);
      // Back in read-only mode with the new name showing
      expect(getByText('A. Adams')).toBeTruthy();
      expect(getByText('Edit')).toBeTruthy();
    });

    // DIST-11
    it('saves only the districts that were changed', async () => {
      const { getByText, getByLabelText } = await renderScreen(admin);

      fireEvent.press(getByText('Edit'));
      fireEvent.press(getByText('Eden'));
      fireEvent.press(getByText('Boland'));
      fireEvent.changeText(getByLabelText('Boland Treasurer'), 'C. Cloete');
      fireEvent.press(getByText('Save'));

      await waitFor(() => expect(saveDistrictDetails).toHaveBeenCalledTimes(1));
      const [, changes] = saveDistrictDetails.mock.calls[0];
      expect(changes.map(c => c.name)).toEqual(['Boland']);
    });

    // DIST-12
    it('stores a cleared name as TBA and keeps the other names', async () => {
      const { getByText, getByLabelText } = await renderScreen(admin);

      fireEvent.press(getByText('Edit'));
      fireEvent.press(getByText('Eden'));
      fireEvent.changeText(getByLabelText('Eden Chairperson'), '   ');
      fireEvent.press(getByText('Save'));

      await waitFor(() => expect(saveDistrictDetails).toHaveBeenCalled());
      expect(saveDistrictDetails).toHaveBeenCalledWith(admin, [
        {
          name: 'Eden',
          board: { chairperson: 'TBA', deputy: 'D. De Villiers', secretary: 'D. Botha', treasurer: 'G. Kemp' },
        },
      ]);
    });

    // DIST-13
    it('does not write anything when nothing changed', async () => {
      const { getByText, getByLabelText, queryByText } = await renderScreen(admin);

      fireEvent.press(getByText('Edit'));
      fireEvent.press(getByText('Eden'));
      // Retyping the same name is not a change
      fireEvent.changeText(getByLabelText('Eden Chairperson'), 'JD Thorne');
      fireEvent.press(getByText('Save'));

      await waitFor(() => expect(queryByText('Save')).toBeNull());
      expect(saveDistrictDetails).not.toHaveBeenCalled();
    });

    // DIST-14
    it('discards unsaved edits on Cancel', async () => {
      const { getByText, getByTestId, getByLabelText, queryByLabelText } = await renderScreen(admin);

      fireEvent.press(getByText('Edit'));
      fireEvent.press(getByText('Boland'));
      fireEvent.changeText(getByLabelText('Boland Chairperson'), 'A. Adams');
      fireEvent.press(getByText('Cancel'));

      expect(queryByLabelText('Boland Chairperson')).toBeNull();
      expect(tbaIn(getByTestId, 'district-board')).toHaveLength(4);
      expect(saveDistrictDetails).not.toHaveBeenCalled();
    });

    // DIST-15
    it('stays in edit mode and reports the error when saving fails', async () => {
      saveDistrictDetails.mockRejectedValue({ message: 'Missing or insufficient permissions.' });
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      const { getByText, getByLabelText } = await renderScreen(admin);

      fireEvent.press(getByText('Edit'));
      fireEvent.press(getByText('Boland'));
      fireEvent.changeText(getByLabelText('Boland Chairperson'), 'A. Adams');
      fireEvent.press(getByText('Save'));

      await waitFor(() =>
        expect(alertSpy).toHaveBeenCalledWith('Could not save', 'Missing or insufficient permissions.')
      );
      // The typed name is still there to retry
      expect(getByLabelText('Boland Chairperson').props.value).toBe('A. Adams');
      expect(getByText('Save')).toBeTruthy();

      alertSpy.mockRestore();
    });

    describe('congregation pastors', () => {
      // DIST-18
      it('lets an admin enter a pastor, save it, and see it afterwards', async () => {
        const { getByText, getByLabelText, queryByText } = await renderScreen(admin);

        fireEvent.press(getByText('Edit'));
        fireEvent.press(getByText('Boland'));

        // Unassigned shows as an empty field with TBA as the placeholder
        const pastor = getByLabelText('Ceres pastor');
        expect(pastor.props.value).toBe('');
        expect(pastor.props.placeholder).toBe('TBA');

        fireEvent.changeText(pastor, '  Ps. J. Smith ');
        fireEvent.press(getByText('Save'));

        await waitFor(() => expect(queryByText('Save')).toBeNull());
        // Only the pastor is sent — the untouched board is not rewritten
        expect(saveDistrictDetails).toHaveBeenCalledWith(admin, [
          { name: 'Boland', pastors: { ceres: 'Ps. J. Smith' } },
        ]);
        expect(getByText('Ps. J. Smith')).toBeTruthy();
      });

      // DIST-19
      it('saves a board change and a pastor change in the same district together', async () => {
        const { getByText, getByLabelText } = await renderScreen(admin);

        fireEvent.press(getByText('Edit'));
        fireEvent.press(getByText('Boland'));
        fireEvent.changeText(getByLabelText('Boland Chairperson'), 'A. Adams');
        fireEvent.changeText(getByLabelText('Ceres pastor'), 'Ps. J. Smith');
        fireEvent.press(getByText('Save'));

        await waitFor(() => expect(saveDistrictDetails).toHaveBeenCalledTimes(1));
        expect(saveDistrictDetails).toHaveBeenCalledWith(admin, [
          {
            name: 'Boland',
            board: { chairperson: 'A. Adams', deputy: 'TBA', secretary: 'TBA', treasurer: 'TBA' },
            pastors: { ceres: 'Ps. J. Smith' },
          },
        ]);
      });

      // DIST-20
      it('keeps earlier saved pastors when a later save adds another', async () => {
        const { getByText, getByLabelText, queryByText } = await renderScreen(admin);

        fireEvent.press(getByText('Edit'));
        fireEvent.press(getByText('Boland'));
        fireEvent.changeText(getByLabelText('Ceres pastor'), 'Ps. J. Smith');
        fireEvent.press(getByText('Save'));
        await waitFor(() => expect(queryByText('Save')).toBeNull());

        fireEvent.press(getByText('Edit'));
        fireEvent.changeText(getByLabelText('Botrivier pastor'), 'Ps. K. Jacobs');
        fireEvent.press(getByText('Save'));
        await waitFor(() => expect(queryByText('Save')).toBeNull());

        // The second save carries only what changed in that session
        expect(saveDistrictDetails).toHaveBeenLastCalledWith(admin, [
          { name: 'Boland', pastors: { botrivier: 'Ps. K. Jacobs' } },
        ]);
        expect(getByText('Ps. J. Smith')).toBeTruthy();
        expect(getByText('Ps. K. Jacobs')).toBeTruthy();
      });

      // DIST-21
      it('puts the TBA placeholder back when a saved pastor is cleared', async () => {
        getDistrictDetails.mockResolvedValue({ boland: { pastors: { ceres: 'Ps. J. Smith' } } });
        const { getByText, getByTestId, getByLabelText, queryByText } = await renderScreen(admin);

        fireEvent.press(getByText('Edit'));
        fireEvent.press(getByText('Boland'));
        expect(getByLabelText('Ceres pastor').props.value).toBe('Ps. J. Smith');
        fireEvent.changeText(getByLabelText('Ceres pastor'), '   ');
        fireEvent.press(getByText('Save'));

        await waitFor(() => expect(queryByText('Save')).toBeNull());
        expect(saveDistrictDetails).toHaveBeenCalledWith(admin, [
          { name: 'Boland', pastors: { ceres: 'TBA' } },
        ]);
        expect(tbaIn(getByTestId, 'district-congregations')).toHaveLength(bolandCongregations.length);
      });

      // DIST-22
      it('does not write anything when a pastor was left as it was', async () => {
        getDistrictDetails.mockResolvedValue({ boland: { pastors: { ceres: 'Ps. J. Smith' } } });
        const { getByText, getByLabelText, queryByText } = await renderScreen(admin);

        fireEvent.press(getByText('Edit'));
        fireEvent.press(getByText('Boland'));
        // Retyping the same name, and blanking one that is already TBA, are not changes
        fireEvent.changeText(getByLabelText('Ceres pastor'), 'Ps. J. Smith');
        fireEvent.changeText(getByLabelText('Botrivier pastor'), '   ');
        fireEvent.press(getByText('Save'));

        await waitFor(() => expect(queryByText('Save')).toBeNull());
        expect(saveDistrictDetails).not.toHaveBeenCalled();
      });

      // DIST-23
      it('discards an unsaved pastor on Cancel', async () => {
        const { getByText, getByTestId, getByLabelText, queryByLabelText } = await renderScreen(admin);

        fireEvent.press(getByText('Edit'));
        fireEvent.press(getByText('Boland'));
        fireEvent.changeText(getByLabelText('Ceres pastor'), 'Ps. J. Smith');
        fireEvent.press(getByText('Cancel'));

        expect(queryByLabelText('Ceres pastor')).toBeNull();
        expect(tbaIn(getByTestId, 'district-congregations')).toHaveLength(bolandCongregations.length);
        expect(saveDistrictDetails).not.toHaveBeenCalled();
      });

      // DIST-24
      it('is not editable by a member', async () => {
        const { getByText, queryByLabelText } = await renderScreen(member);

        fireEvent.press(getByText('Boland'));

        expect(queryByLabelText('Ceres pastor')).toBeNull();
      });
    });
  });
});
