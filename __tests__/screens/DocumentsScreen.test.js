import React from 'react';
import { Linking } from 'react-native';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import DocumentsScreen from '../../screens/DocumentsScreen';
import { UserContext } from '../../context/UserContext';

jest.mock('../../services/documentsService', () => ({
  getDocuments: jest.fn(),
  uploadDocument: jest.fn(),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

import { getDocuments } from '../../services/documentsService';

const leaderUser = { uid: 'uid-1', name: 'Lena', role: 'leader' };

const mockDocs = [
  {
    id: 'd1',
    name: 'Constitution',
    category: 'Governance',
    fileType: 'pdf',
    fileSize: '1.2 MB',
    downloadUrl: 'https://storage.example.com/constitution.pdf',
  },
  {
    id: 'd2',
    name: 'Camp Registration Form',
    category: 'Forms',
    fileType: 'docx',
    fileSize: '80 KB',
    downloadUrl: 'https://storage.example.com/camp-form.docx',
  },
];

const renderScreen = (user = leaderUser) => {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  const utils = render(
    <UserContext.Provider value={{ user, onLogin: jest.fn(), onLogout: jest.fn() }}>
      <DocumentsScreen navigation={navigation} />
    </UserContext.Provider>
  );
  return { ...utils, navigation };
};

beforeEach(() => {
  jest.clearAllMocks();
  getDocuments.mockResolvedValue(mockDocs);
});

describe('DocumentsScreen', () => {
  // DOC-01
  it('narrows the list with the category filter chips', async () => {
    const { getByText, queryByText } = renderScreen();

    await waitFor(() => getByText('Constitution'));
    expect(getByText('Camp Registration Form')).toBeTruthy();

    fireEvent.press(getByText('Governance'));

    expect(getByText('Constitution')).toBeTruthy();
    expect(queryByText('Camp Registration Form')).toBeNull();
  });

  // DOC-02
  it('opens the document URL from the download control', async () => {
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

    const { getByText, getAllByText } = renderScreen();
    await waitFor(() => getByText('Constitution'));

    fireEvent.press(getAllByText('⬇')[0]);

    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith(
        'https://storage.example.com/constitution.pdf'
      );
    });
  });

  // DOC-04
  it('redirects a member straight back without loading documents', () => {
    const { navigation } = renderScreen({ uid: 'uid-2', name: 'Mo', role: 'member' });

    expect(navigation.goBack).toHaveBeenCalled();
    expect(getDocuments).not.toHaveBeenCalled();
  });

  // DOC-05
  it('shows an empty state when no documents are uploaded', async () => {
    getDocuments.mockResolvedValue([]);

    const { getByText } = renderScreen();

    await waitFor(() => {
      expect(getByText('No Documents Yet')).toBeTruthy();
      expect(
        getByText('Documents uploaded by an admin will appear here.')
      ).toBeTruthy();
    });
  });

  // DOC-06
  it('lets an admin upload a new document', async () => {
    const DocumentPicker = require('expo-document-picker');
    jest.spyOn(DocumentPicker, 'getDocumentAsync').mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///policy.pdf', name: 'policy.pdf', mimeType: 'application/pdf', size: 2048 }],
    });
    const { uploadDocument } = require('../../services/documentsService');
    uploadDocument.mockResolvedValue({ success: true, documentId: 'doc-new' });

    const adminUser = { uid: 'admin-1', name: 'Nadia', role: 'admin' };
    const { getByText, getAllByText, getByPlaceholderText } = renderScreen(adminUser);

    await waitFor(() => getByText('+ Upload Document'));
    fireEvent.press(getByText('+ Upload Document'));

    fireEvent.press(getByText('📎 Choose File (PDF, image, Word or Excel)'));
    await waitFor(() => expect(DocumentPicker.getDocumentAsync).toHaveBeenCalled());

    fireEvent.changeText(getByPlaceholderText('e.g. Church Constitution'), 'Church Policy');
    fireEvent.press(getAllByText('Upload Document').slice(-1)[0]);

    await waitFor(() => {
      expect(uploadDocument).toHaveBeenCalledWith(
        adminUser,
        expect.objectContaining({
          name: 'Church Policy',
          file: expect.objectContaining({ uri: 'file:///policy.pdf' }),
        })
      );
    });
    await waitFor(() => getByText('+ Upload Document'));
  });
});
