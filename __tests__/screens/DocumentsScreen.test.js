import React from 'react';
import { Linking, Platform } from 'react-native';
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
    jest.replaceProperty(Platform, 'OS', 'ios');
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

    const { getByText, getByLabelText } = renderScreen();
    await waitFor(() => getByText('Constitution'));

    fireEvent.press(getByLabelText('Download Constitution'));

    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith(
        'https://storage.example.com/constitution.pdf'
      );
    });
  });

  // DOC-03
  describe('on iPhone', () => {
    beforeEach(() => jest.replaceProperty(Platform, 'OS', 'ios'));
    afterEach(() => jest.restoreAllMocks());

    it('keeps the original single ⬇ download button and offers no View', async () => {
      const { getByText, getAllByText, queryByText, queryByLabelText } = renderScreen();
      await waitFor(() => getByText('Constitution'));

      expect(getAllByText('⬇')).toHaveLength(2);
      expect(queryByLabelText('View Constitution')).toBeNull();
      expect(queryByText('View')).toBeNull();
      expect(queryByText('⬇ Download')).toBeNull();
    });

    it('opens the raw document link from the ⬇ button, not Google\'s viewer', async () => {
      jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
      jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
      const { getByText, getByLabelText } = renderScreen();
      await waitFor(() => getByText('Constitution'));

      fireEvent.press(getByLabelText('Download Constitution'));

      await waitFor(() => expect(Linking.openURL).toHaveBeenCalledTimes(1));
      expect(Linking.openURL).toHaveBeenCalledWith('https://storage.example.com/constitution.pdf');
    });
  });

  // DOC-03
  describe('viewing without downloading (Android)', () => {
    const imageDoc = {
      id: 'd3',
      name: 'Camp Photo',
      category: 'Photos',
      fileType: 'JPG',
      fileSize: '400 KB',
      downloadUrl: 'https://storage.example.com/camp.jpg?alt=media&token=abc',
    };

    beforeEach(() => {
      jest.replaceProperty(Platform, 'OS', 'android');
      jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
      jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    });
    afterEach(() => jest.restoreAllMocks());

    it('offers View and Download on every document, instead of the lone ⬇', async () => {
      const { getByText, getByLabelText, queryByText } = renderScreen();
      await waitFor(() => getByText('Constitution'));
      expect(queryByText('⬇')).toBeNull();

      expect(getByLabelText('View Constitution')).toBeTruthy();
      expect(getByLabelText('Download Constitution')).toBeTruthy();
      expect(getByLabelText('View Camp Registration Form')).toBeTruthy();
      expect(getByLabelText('Download Camp Registration Form')).toBeTruthy();
    });

    it('shows a PDF through Google\'s viewer, with its private link encoded, instead of the raw file', async () => {
      const { getByText, getByLabelText } = renderScreen();
      await waitFor(() => getByText('Constitution'));

      fireEvent.press(getByLabelText('View Constitution'));

      await waitFor(() => {
        expect(Linking.openURL).toHaveBeenCalledWith(
          'https://docs.google.com/gview?embedded=true&url=' +
            encodeURIComponent('https://storage.example.com/constitution.pdf')
        );
      });
      expect(Linking.openURL).not.toHaveBeenCalledWith('https://storage.example.com/constitution.pdf');
    });

    it('does the same for a Word document', async () => {
      const { getByText, getByLabelText } = renderScreen();
      await waitFor(() => getByText('Camp Registration Form'));

      fireEvent.press(getByLabelText('View Camp Registration Form'));

      await waitFor(() => {
        expect(Linking.openURL).toHaveBeenCalledWith(
          expect.stringContaining(encodeURIComponent('https://storage.example.com/camp-form.docx'))
        );
      });
    });

    it('keeps the token in the private link intact by encoding it as one parameter', async () => {
      getDocuments.mockResolvedValue([
        { ...mockDocs[0], downloadUrl: 'https://storage.example.com/a.pdf?alt=media&token=abc-123' },
      ]);
      const { getByText, getByLabelText } = renderScreen();
      await waitFor(() => getByText('Constitution'));

      fireEvent.press(getByLabelText('View Constitution'));

      await waitFor(() => expect(Linking.openURL).toHaveBeenCalled());
      const opened = Linking.openURL.mock.calls[0][0];
      // One query string for Google: the document's own "&token=" must not leak out of it.
      expect(opened.split('&').filter((part) => part.startsWith('token='))).toEqual([]);
      expect(decodeURIComponent(opened.split('url=')[1])).toBe(
        'https://storage.example.com/a.pdf?alt=media&token=abc-123'
      );
    });

    it('opens a picture inside the app and never leaves for the browser', async () => {
      getDocuments.mockResolvedValue([...mockDocs, imageDoc]);
      const { getByText, getByLabelText, queryByLabelText } = renderScreen();
      await waitFor(() => getByText('Camp Photo'));
      expect(queryByLabelText('Close')).toBeNull();

      fireEvent.press(getByLabelText('View Camp Photo'));

      await waitFor(() => expect(getByLabelText('Close')).toBeTruthy());
      expect(getByLabelText('Camp Photo').props.source).toEqual({ uri: imageDoc.downloadUrl });
      expect(Linking.openURL).not.toHaveBeenCalled();
    });

    it('closes the picture viewer', async () => {
      getDocuments.mockResolvedValue([...mockDocs, imageDoc]);
      const { getByText, getByLabelText, queryByLabelText } = renderScreen();
      await waitFor(() => getByText('Camp Photo'));
      fireEvent.press(getByLabelText('View Camp Photo'));
      await waitFor(() => getByLabelText('Close'));

      fireEvent.press(getByLabelText('Close'));

      await waitFor(() => expect(queryByLabelText('Close')).toBeNull());
    });

    it('treats a lowercase or JPEG extension as a picture too', async () => {
      getDocuments.mockResolvedValue([
        { ...imageDoc, id: 'd4', name: 'Banner', fileType: 'jpeg' },
      ]);
      const { getByText, getByLabelText } = renderScreen();
      await waitFor(() => getByText('Banner'));

      fireEvent.press(getByLabelText('View Banner'));

      await waitFor(() => expect(getByLabelText('Close')).toBeTruthy());
      expect(Linking.openURL).not.toHaveBeenCalled();
    });

    it('says so when the viewer page cannot be opened', async () => {
      const { Alert } = require('react-native');
      jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      Linking.canOpenURL.mockResolvedValue(false);
      const { getByText, getByLabelText } = renderScreen();
      await waitFor(() => getByText('Constitution'));

      fireEvent.press(getByLabelText('View Constitution'));

      await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Error', 'Cannot open this document.'));
      expect(Linking.openURL).not.toHaveBeenCalled();
    });

    it('does not crash when opening throws', async () => {
      const { Alert } = require('react-native');
      jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      Linking.openURL.mockRejectedValue(new Error('no browser'));
      const { getByText, getByLabelText } = renderScreen();
      await waitFor(() => getByText('Constitution'));

      fireEvent.press(getByLabelText('View Constitution'));

      await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to open the document.'));
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
