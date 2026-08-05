import React from 'react';
import { Alert } from 'react-native';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import RegisterScreen from '../../screens/RegisterScreen';
import { UserContext } from '../../context/UserContext';

jest.mock('../../services/authService', () => ({
  registerUser: jest.fn(),
  logoutUser: jest.fn(),
}));

import { registerUser, logoutUser } from '../../services/authService';

const renderScreen = () => {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  const onLogin = jest.fn();
  const utils = render(
    <UserContext.Provider value={{ user: null, onLogin, onLogout: jest.fn() }}>
      <RegisterScreen navigation={navigation} />
    </UserContext.Provider>
  );
  return { ...utils, navigation, onLogin };
};

const fillStep1 = (utils, overrides = {}) => {
  const values = {
    name: 'Alice Adams',
    email: 'alice@example.com',
    phone: '+27 82 000 0000',
    password: 'secret123',
    confirmPassword: 'secret123',
    ...overrides,
  };
  fireEvent.changeText(utils.getByPlaceholderText('Your full name'), values.name);
  fireEvent.changeText(utils.getByPlaceholderText('your@email.com'), values.email);
  fireEvent.changeText(utils.getByPlaceholderText('+27 XX XXX XXXX'), values.phone);
  const passwordInputs = utils.getAllByPlaceholderText('••••••••');
  fireEvent.changeText(passwordInputs[0], values.password);
  fireEvent.changeText(passwordInputs[1], values.confirmPassword);
};

const goToStep3 = (utils, roleLabel) => {
  fillStep1(utils);
  fireEvent.press(utils.getByText('Next'));
  if (roleLabel) fireEvent.press(utils.getByText(roleLabel));
  fireEvent.press(utils.getByText('Next'));
};

const pickCongregation = (utils, name = 'Ceres') => {
  fireEvent.press(utils.getByText('Select your congregation'));
  fireEvent.press(utils.getByText(name));
};

const acceptTerms = (utils) => {
  fireEvent.press(utils.getByText('I agree to the Terms of Service and Privacy Policy'));
};

// The screen header is also titled "Create Account" — the button is the last match.
const pressCreateAccount = (utils) => {
  const matches = utils.getAllByText('Create Account');
  fireEvent.press(matches[matches.length - 1]);
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

describe('RegisterScreen', () => {
  // AUTH-12
  it('blocks step 1 on an invalid email format', () => {
    const utils = renderScreen();
    fillStep1(utils, { email: 'abc' });
    fireEvent.press(utils.getByText('Next'));

    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please enter a valid email address');
    expect(utils.getByText('Step 1 of 3')).toBeTruthy();
  });

  // AUTH-13
  it('blocks step 1 when the password is under 6 characters', () => {
    const utils = renderScreen();
    fillStep1(utils, { password: 'abc', confirmPassword: 'abc' });
    fireEvent.press(utils.getByText('Next'));

    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Password must be at least 6 characters');
    expect(utils.getByText('Step 1 of 3')).toBeTruthy();
  });

  // AUTH-14
  it('blocks step 1 when the passwords do not match', () => {
    const utils = renderScreen();
    fillStep1(utils, { confirmPassword: 'different1' });
    fireEvent.press(utils.getByText('Next'));

    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Passwords do not match');
    expect(utils.getByText('Step 1 of 3')).toBeTruthy();
  });

  // AUTH-15
  it('registers a member as auto-approved and logs straight in', async () => {
    registerUser.mockResolvedValue({
      uid: 'uid-new',
      status: 'approved',
      message: 'Welcome to PPC National!',
    });

    const utils = renderScreen();
    goToStep3(utils); // default role is member
    pickCongregation(utils);
    acceptTerms(utils);
    pressCreateAccount(utils);

    await waitFor(() => {
      expect(registerUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'alice@example.com',
          role: 'member',
          congregation: 'Ceres',
          district: 'Boland',
        })
      );
      expect(Alert.alert).toHaveBeenCalledWith(
        'Welcome!',
        'Welcome to PPC National!',
        expect.anything()
      );
    });

    // Pressing OK on the alert is what completes login
    const okButton = Alert.alert.mock.calls.find(c => c[0] === 'Welcome!')[2][0];
    okButton.onPress();
    expect(utils.onLogin).toHaveBeenCalledWith(
      expect.objectContaining({ uid: 'uid-new', role: 'member', status: 'approved' })
    );
  });

  // AUTH-16
  it('submits a leader registration as pending and returns to Login', async () => {
    registerUser.mockResolvedValue({
      uid: 'uid-new',
      status: 'pending',
      message: 'Your registration is awaiting admin approval.',
    });
    logoutUser.mockResolvedValue(undefined);

    const utils = renderScreen();
    goToStep3(utils, 'Leader');
    pickCongregation(utils);
    acceptTerms(utils);
    pressCreateAccount(utils);

    await waitFor(() => {
      expect(registerUser).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'leader' })
      );
      expect(logoutUser).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith(
        'Registration Submitted',
        'Your registration is awaiting admin approval.',
        expect.anything()
      );
    });

    const okButton = Alert.alert.mock.calls.find(c => c[0] === 'Registration Submitted')[2][0];
    okButton.onPress();
    expect(utils.navigation.navigate).toHaveBeenCalledWith('Login');
    expect(utils.onLogin).not.toHaveBeenCalled();
  });

  // AUTH-17
  it('auto-fills the district when a congregation is picked', () => {
    const utils = renderScreen();
    goToStep3(utils);
    pickCongregation(utils, 'Ceres');

    expect(utils.getByText('Ceres')).toBeTruthy();
    expect(utils.getByText('Boland')).toBeTruthy();
  });

  // AUTH-18
  it('blocks submission until the Terms checkbox is ticked', async () => {
    const utils = renderScreen();
    goToStep3(utils);
    pickCongregation(utils);
    pressCreateAccount(utils);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Error',
      'Please accept the Terms of Service to continue'
    );
    expect(registerUser).not.toHaveBeenCalled();
  });

  // AUTH-18 (precondition variant)
  it('blocks submission when no congregation is selected', () => {
    const utils = renderScreen();
    goToStep3(utils);
    acceptTerms(utils);
    pressCreateAccount(utils);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Error',
      'Please select your congregation and district'
    );
    expect(registerUser).not.toHaveBeenCalled();
  });

  // AUTH-19
  it('shows Registration Failed when the email is already in use', async () => {
    registerUser.mockRejectedValue(new Error('This email address is already registered.'));

    const utils = renderScreen();
    goToStep3(utils);
    pickCongregation(utils);
    acceptTerms(utils);
    pressCreateAccount(utils);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Registration Failed',
        'This email address is already registered.'
      );
    });
    expect(utils.onLogin).not.toHaveBeenCalled();
  });

  // AUTH-20
  it('returns to Login from step 1 and to the previous step from step 2', () => {
    const utils = renderScreen();
    fireEvent.press(utils.getByText('Back'));
    expect(utils.navigation.navigate).toHaveBeenCalledWith('Login');

    fillStep1(utils);
    fireEvent.press(utils.getByText('Next'));
    expect(utils.getByText('Step 2 of 3')).toBeTruthy();

    fireEvent.press(utils.getByText('Back'));
    expect(utils.getByText('Step 1 of 3')).toBeTruthy();
  });
});
