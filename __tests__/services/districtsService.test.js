import {
  districtDocId,
  congregationKey,
  getDistrictDetails,
  saveDistrictDetails,
} from '../../services/districtsService';
import { DISTRICTS, CONGREGATIONS } from '../../constants/config';

const mockBatch = { set: jest.fn(), commit: jest.fn() };

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((db, path) => ({ path })),
  doc: jest.fn((db, ...segments) => ({ path: segments.join('/') })),
  getDocs: jest.fn(),
  writeBatch: jest.fn(() => mockBatch),
  serverTimestamp: jest.fn(() => 'SERVER_TS'),
}));

import { getDocs } from 'firebase/firestore';

const admin = { uid: 'admin-1' };
const board = { chairperson: 'A. Adams', deputy: 'TBA', secretary: 'TBA', treasurer: 'TBA' };
const pastors = { ceres: 'Ps. J. Smith' };

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  mockBatch.commit.mockResolvedValue();
});

afterEach(() => {
  console.error.mockRestore();
});

describe('districtDocId', () => {
  it('turns a district name into a lowercase slug', () => {
    expect(districtDocId('Boland')).toBe('boland');
    expect(districtDocId('Central Cape')).toBe('central-cape');
    expect(districtDocId(' Free  State ')).toBe('free-state');
  });

  it('gives every configured district its own id', () => {
    const ids = DISTRICTS.map(d => districtDocId(d.name));
    expect(new Set(ids).size).toBe(DISTRICTS.length);
  });
});

describe('congregationKey', () => {
  it('flattens names with slashes and brackets into a safe map key', () => {
    expect(congregationKey('HVG/Bloemfontein')).toBe('hvg-bloemfontein');
    expect(congregationKey('Worcester (Ebed)')).toBe('worcester-ebed');
    expect(congregationKey('New Horizon/Plettenberg Baai')).toBe('new-horizon-plettenberg-baai');
  });

  // Two congregations in one district that slug alike would share a pastor.
  it('gives every congregation in a district its own key', () => {
    DISTRICTS.forEach(district => {
      const keys = CONGREGATIONS.filter(c => c.district === district.name).map(c => congregationKey(c.name));
      expect(new Set(keys).size).toBe(keys.length);
    });
  });
});

describe('getDistrictDetails', () => {
  it('returns saved boards and pastors keyed by doc id, skipping docs with neither', async () => {
    getDocs.mockResolvedValue({
      docs: [
        { id: 'boland', data: () => ({ name: 'Boland', board, pastors }) },
        { id: 'eden', data: () => ({ name: 'Eden', pastors }) },
        { id: 'gauteng', data: () => ({ name: 'Gauteng' }) },
      ],
    });

    expect(await getDistrictDetails()).toEqual({
      boland: { board, pastors },
      eden: { board: undefined, pastors },
    });
  });

  it('throws rather than reporting "no saved names" when the read fails', async () => {
    getDocs.mockRejectedValue(new Error('offline'));

    await expect(getDistrictDetails()).rejects.toEqual({ message: 'Failed to load district details.' });
  });
});

describe('saveDistrictDetails', () => {
  it('writes every changed district in a single batch', async () => {
    const result = await saveDistrictDetails(admin, [
      { name: 'Boland', board, pastors },
      { name: 'Central Cape', board },
    ]);

    expect(result).toEqual({ success: true });
    expect(mockBatch.set).toHaveBeenCalledTimes(2);
    expect(mockBatch.set).toHaveBeenCalledWith(
      { path: 'districts/boland' },
      { name: 'Boland', board, pastors, updatedBy: 'admin-1', updatedAt: 'SERVER_TS' },
      { merge: true }
    );
    expect(mockBatch.set).toHaveBeenCalledWith(
      { path: 'districts/central-cape' },
      expect.objectContaining({ name: 'Central Cape' }),
      { merge: true }
    );
    expect(mockBatch.commit).toHaveBeenCalledTimes(1);
  });

  // With a merge, an omitted field is left alone in Firestore — so a
  // pastors-only save must not carry a board, and vice versa.
  it('sends only the parts that were given', async () => {
    await saveDistrictDetails(admin, [{ name: 'Boland', pastors }]);
    await saveDistrictDetails(admin, [{ name: 'Eden', board }]);

    const [, boland] = mockBatch.set.mock.calls[0];
    const [, eden] = mockBatch.set.mock.calls[1];
    expect(boland).not.toHaveProperty('board');
    expect(boland).toHaveProperty('pastors', pastors);
    expect(eden).not.toHaveProperty('pastors');
    expect(eden).toHaveProperty('board', board);
  });

  it('surfaces the failure to the caller', async () => {
    mockBatch.commit.mockRejectedValue(new Error('Missing or insufficient permissions.'));

    await expect(saveDistrictDetails(admin, [{ name: 'Boland', board }])).rejects.toEqual({
      message: 'Missing or insufficient permissions.',
    });
  });
});
