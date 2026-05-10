import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import LoginScreen from '../../screens/LoginScreen';
import { UserContext } from '../../context/UserContext';

jest.mock('../../services/authService', () => ({
  loginUser: jest.fn(),
  sendResetEmail: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
}));

import { loginUser } from '../../services/authService';

const mockOnLogin = jest.fn();

const renderLogin = (overrides = {}) => {
  const contextValue = { user: null, onLogin: mockOnLogin, onLogout: jest.fn(), ...overrides };
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  return render(
    <UserContext.Provider value={contextValue}>
      <LoginScreen navigation={navigation} />
    </UserContext.Provider>
  );
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('LoginScreen rendering', () => {
  it('renders the church title and welcome heading', () => {
    const { getByText } = renderLogin();
    expect(getByText('Pentecostal Protestant Church')).toBeTruthy();
    expect(getByText('Welcome Back')).toBeTruthy();
  });

  it('renders email and password inputs', () => {
    const { getByPlaceholderText } = renderLogin();
    expect(getByPlaceholderText('your@email.com')).toBeTruthy();
    expect(getByPlaceholderText('••••••••')).toBeTruthy();
  });
});

describe('LoginScreen validation', () => {
  it('shows an alert when fields are empty', async () => {
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');
    const { getByText } = renderLogin();

    await act(async () => {
      fireEvent.press(getByText('Sign In'));
    });

    expect(alertSpy).toHaveBeenCalledWith('Error', 'Please fill in all fields');
    expect(loginUser).not.toHaveBeenCalled();
  });
});

describe('LoginScreen login flow', () => {
  it('calls loginUser with trimmed credentials', async () => {
    loginUser.mockResolvedValue({
      success: true,
      user: { uid: 'uid-1', role: 'member', status: 'approved' },
    });

    const { getByPlaceholderText, getByText } = renderLogin();

    fireEvent.changeText(getByPlaceholderText('your@email.com'), '  test@church.com  ');
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'password123');

    await act(async () => {
      fireEvent.press(getByText('Sign In'));
    });

    expect(loginUser).toHaveBeenCalledWith('test@church.com', 'password123');
  });

  it('calls onLogin with user data on success', async () => {
    const mockUser = { uid: 'uid-1', role: 'member', status: 'approved' };
    loginUser.mockResolvedValue({ success: true, user: mockUser });

    const { getByPlaceholderText, getByText } = renderLogin();

    fireEvent.changeText(getByPlaceholderText('your@email.com'), 'test@church.com');
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'password123');

    await act(async () => {
      fireEvent.press(getByText('Sign In'));
    });

    expect(mockOnLogin).toHaveBeenCalledWith(mockUser);
  });

  it('shows an alert on login failure', async () => {
    loginUser.mockRejectedValue({ message: 'Incorrect password' });
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');

    const { getByPlaceholderText, getByText } = renderLogin();

    fireEvent.changeText(getByPlaceholderText('your@email.com'), 'test@church.com');
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'wrongpassword');

    await act(async () => {
      fireEvent.press(getByText('Sign In'));
    });

    expect(alertSpy).toHaveBeenCalledWith('Login Failed', 'Incorrect password');
  });
});
