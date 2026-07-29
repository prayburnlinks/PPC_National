import {
  ROLES,
  USER_STATUS,
  DISTRICTS,
  CONGREGATIONS,
  BANK_DETAILS,
  NATIONAL_BOARD,
} from '../../constants/config';

describe('ROLES', () => {
  it('defines all four roles', () => {
    expect(ROLES.VISITOR).toBe('visitor');
    expect(ROLES.MEMBER).toBe('member');
    expect(ROLES.LEADER).toBe('leader');
    expect(ROLES.ADMIN).toBe('admin');
  });
});

describe('USER_STATUS', () => {
  it('defines all required status values', () => {
    expect(USER_STATUS.PENDING).toBe('pending');
    expect(USER_STATUS.APPROVED).toBe('approved');
    expect(USER_STATUS.REJECTED).toBe('rejected');
    expect(USER_STATUS.INACTIVE).toBe('inactive');
  });
});

describe('DISTRICTS', () => {
  it('contains exactly 9 districts', () => {
    expect(DISTRICTS).toHaveLength(9);
  });

  it('every district has required fields', () => {
    DISTRICTS.forEach((d) => {
      expect(d).toHaveProperty('id');
      expect(d).toHaveProperty('name');
      expect(d).toHaveProperty('congregations');
    });
  });

  it('district ids are unique', () => {
    const ids = DISTRICTS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('is sorted alphabetically by name (regression)', () => {
    const names = DISTRICTS.map((d) => d.name);
    expect(names).toEqual([...names].sort());
  });

  it('includes Boland and does not include West Coast (regression)', () => {
    const names = DISTRICTS.map((d) => d.name);
    expect(names).toContain('Boland');
    expect(names).not.toContain('West Coast');
  });

  it('each congregation group within CONGREGATIONS is sorted alphabetically (regression)', () => {
    DISTRICTS.forEach((d) => {
      const namesInDistrict = CONGREGATIONS.filter((c) => c.district === d.name).map((c) => c.name);
      expect(namesInDistrict).toEqual([...namesInDistrict].sort());
    });
  });
});

describe('CONGREGATIONS', () => {
  it('contains 81 congregations', () => {
    expect(CONGREGATIONS).toHaveLength(81);
  });

  it('every congregation has a name and district', () => {
    CONGREGATIONS.forEach((c) => {
      expect(typeof c.name).toBe('string');
      expect(c.name.length).toBeGreaterThan(0);
      expect(typeof c.district).toBe('string');
    });
  });

  it('all district references match a known district name', () => {
    const districtNames = new Set(DISTRICTS.map((d) => d.name));
    CONGREGATIONS.forEach((c) => {
      expect(districtNames.has(c.district)).toBe(true);
    });
  });
});

describe('BANK_DETAILS', () => {
  it('has required banking fields', () => {
    expect(BANK_DETAILS).toHaveProperty('bank');
    expect(BANK_DETAILS).toHaveProperty('accountNumber');
    expect(BANK_DETAILS).toHaveProperty('branchCode');
    expect(BANK_DETAILS).toHaveProperty('accountType');
  });
});

describe('NATIONAL_BOARD', () => {
  it('has exactly 8 members', () => {
    expect(NATIONAL_BOARD).toHaveLength(8);
  });

  it('every member has a name and portfolio', () => {
    NATIONAL_BOARD.forEach((m) => {
      expect(typeof m.name).toBe('string');
      expect(m.name.length).toBeGreaterThan(0);
      expect(typeof m.portfolio).toBe('string');
    });
  });

  it('Children ministry has correct apostrophe (regression)', () => {
    const youth = NATIONAL_BOARD.find((m) =>
      m.portfolio.toLowerCase().includes('children')
    );
    expect(youth).toBeDefined();
    expect(youth.portfolio).toContain("Children's");
    expect(youth.portfolio).not.toContain('Childrens');
  });
});
