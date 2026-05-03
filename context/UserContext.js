import { createContext, useContext } from 'react';

export const UserContext = createContext({ user: null, onLogin: () => {}, onLogout: () => {} });

export const useUser = () => useContext(UserContext);
