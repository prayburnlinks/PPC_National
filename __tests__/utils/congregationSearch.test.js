import { searchCongregations } from '../../utils/congregationSearch';
import { CONGREGATIONS } from '../../constants/config';

const names = (list) => list.map((congregation) => congregation.name);

describe('searchCongregations', () => {
  it.each(['', '   ', '()', ' / - ', undefined, null])(
    'returns the whole list, as given, for the query %p',
    (query) => {
      expect(searchCongregations(CONGREGATIONS, query)).toBe(CONGREGATIONS);
    }
  );

  it('ignores case', () => {
    expect(names(searchCongregations(CONGREGATIONS, 'CERES'))).toContain('Ceres');
    expect(names(searchCongregations(CONGREGATIONS, 'ceres'))).toContain('Ceres');
  });

  it('matches anywhere in the name, not only the start', () => {
    expect(names(searchCongregations(CONGREGATIONS, 'olive'))).toContain('Mt Olive');
  });

  it('narrows as more is typed', () => {
    const one = searchCongregations(CONGREGATIONS, 'c');
    const three = searchCongregations(CONGREGATIONS, 'cer');

    expect(three.length).toBeLessThan(one.length);
    expect(names(three)).toContain('Ceres');
  });

  describe('punctuation in the names', () => {
    it.each([
      ['graaff reinet', 'Graaff-Reinet'],
      ['graaff-reinet', 'Graaff-Reinet'],
      ['oos london', 'Oos-London'],
      ['worcester ebed', 'Worcester (Ebed)'],
      ['worcester (ebed)', 'Worcester (Ebed)'],
      ['hornlee', 'Knysna/Hornlee'],
      ['knysna hornlee', 'Knysna/Hornlee'],
      ['bloemfontein', 'HVG/Bloemfontein'],
      ['plettenberg', 'New Horizon/Plettenberg Baai'],
    ])('finds "%s" as %s', (query, expected) => {
      expect(names(searchCongregations(CONGREGATIONS, query))).toContain(expected);
    });
  });

  it('needs every word to match, in any order', () => {
    expect(names(searchCongregations(CONGREGATIONS, 'london oos'))).toEqual(['Oos-London']);
    expect(searchCongregations(CONGREGATIONS, 'oos paarl')).toEqual([]);
  });

  describe('districts', () => {
    it("lists a district's congregations when its name is typed", () => {
      const result = searchCongregations(CONGREGATIONS, 'eastern cape');

      expect(names(result)).toContain('Despatch');
      expect(names(result)).not.toContain('Ceres');
      expect(result.every((c) => c.district === 'Eastern Cape')).toBe(true);
    });

    it('narrows a congregation by its district too', () => {
      expect(names(searchCongregations(CONGREGATIONS, 'ceres boland'))).toEqual(['Ceres']);
    });
  });

  describe('ordering', () => {
    const list = [
      { name: 'Alpha Eden', district: 'North' }, // contains the query
      { name: 'Beta', district: 'Eden' }, // only its district matches
      { name: 'Eden', district: 'South' }, // starts with the query
      { name: 'Edenvale', district: 'South' }, // starts with the query
    ];

    it('puts names starting with the query first, then names containing it, then district matches', () => {
      expect(names(searchCongregations(list, 'eden'))).toEqual(['Eden', 'Edenvale', 'Alpha Eden', 'Beta']);
    });

    it('puts the congregation called Eden ahead of the Eden district', () => {
      const result = searchCongregations(CONGREGATIONS, 'eden');

      expect(names(result)[0]).toBe('Eden');
      expect(names(result)).toContain('Graaff-Reinet'); // in the Eden district
    });

    it('keeps the original order among equally good matches, rather than sorting them', () => {
      const unsorted = [
        { name: 'Zeta', district: 'South' },
        { name: 'Alpha', district: 'South' },
        { name: 'Mid', district: 'North' },
      ];

      expect(names(searchCongregations(unsorted, 'south'))).toEqual(['Zeta', 'Alpha']);
    });
  });

  it('returns an empty list when nothing matches', () => {
    expect(searchCongregations(CONGREGATIONS, 'zzzz')).toEqual([]);
  });

  it('does not change the list it is given', () => {
    const copy = CONGREGATIONS.map((congregation) => ({ ...congregation }));

    searchCongregations(CONGREGATIONS, 'eden');

    expect(CONGREGATIONS).toEqual(copy);
  });

  it('every congregation can be found by its own name', () => {
    CONGREGATIONS.forEach((congregation) => {
      expect(searchCongregations(CONGREGATIONS, congregation.name)).toContainEqual(congregation);
    });
  });
});
