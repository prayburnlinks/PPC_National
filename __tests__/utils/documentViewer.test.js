import { isImageType, googleViewerUrl } from '../../utils/documentViewer';

describe('isImageType', () => {
  it.each(['JPG', 'JPEG', 'PNG', 'jpg', 'Png'])('treats %s as a picture', (type) => {
    expect(isImageType(type)).toBe(true);
  });

  it.each(['PDF', 'DOCX', 'DOC', 'XLSX', 'XLS', 'GIF', '', null, undefined])(
    'does not treat %p as a picture',
    (type) => {
      expect(isImageType(type)).toBe(false);
    }
  );
});

describe('googleViewerUrl', () => {
  it('wraps the private link in Google’s viewer address', () => {
    expect(googleViewerUrl('https://example.com/a.pdf')).toBe(
      'https://docs.google.com/gview?embedded=true&url=https%3A%2F%2Fexample.com%2Fa.pdf'
    );
  });

  it('encodes the query string and token so they stay inside the one parameter', () => {
    const url = googleViewerUrl('https://example.com/a.pdf?alt=media&token=t-1');
    expect(url).toBe(
      'https://docs.google.com/gview?embedded=true&url=https%3A%2F%2Fexample.com%2Fa.pdf%3Falt%3Dmedia%26token%3Dt-1'
    );
    expect(url.match(/&/g)).toHaveLength(1);
  });
});
