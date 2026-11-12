/**
 * How a document opens when someone taps View (rather than Download).
 *
 * Pictures open inside the app. Everything else (PDF, Word, Excel) is shown by
 * Google's document viewer in the phone's browser, because the app has no PDF or
 * Office viewer of its own and phones differ on whether their browser shows
 * these files or just downloads them. The catch: Google's viewer fetches the
 * file from its private link, so the document passes through Google. A proper
 * in-app viewer would avoid that but needs a new store build.
 */

const IMAGE_TYPES = ['JPG', 'JPEG', 'PNG'];

// `fileType` is the extension stored with the document ("PDF", "JPG", ...).
export const isImageType = (fileType) =>
  IMAGE_TYPES.includes(String(fileType || '').toUpperCase());

const GOOGLE_VIEWER = 'https://docs.google.com/gview?embedded=true&url=';

// The download link carries `?alt=media&token=...`, so it has to be encoded to
// survive being a query parameter itself.
export const googleViewerUrl = (downloadUrl) => `${GOOGLE_VIEWER}${encodeURIComponent(downloadUrl)}`;
