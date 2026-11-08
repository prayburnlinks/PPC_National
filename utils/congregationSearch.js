/**
 * Typeahead for the sign-up congregation picker.
 *
 * There are 81 congregations, so scrolling for yours is slow. Members type what
 * they remember of the name — "olive", "graaff reinet", "hornlee" — and the
 * list narrows as they go. Several names carry punctuation ("Oos-London",
 * "Worcester (Ebed)", "Knysna/Hornlee"), so matching works on lowercase words
 * with the punctuation stripped out, and typing the district narrows the list
 * too ("eastern cape", or "ceres boland").
 */

const normalize = (text) =>
  String(text ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * The congregations matching `query`, best first: names that start with it,
 * then names that contain it, then ones that only match through their district.
 * Equally good matches keep their original order. An empty query returns the
 * list as it was given.
 */
export const searchCongregations = (congregations, query) => {
  const needle = normalize(query);
  if (!needle) return congregations;

  const words = needle.split(' ');
  const matches = [];

  congregations.forEach((congregation, index) => {
    const name = normalize(congregation.name);
    const nameAndDistrict = `${name} ${normalize(congregation.district)}`;

    let rank;
    if (name.startsWith(needle)) rank = 0;
    else if (words.every((word) => name.includes(word))) rank = 1;
    else if (words.every((word) => nameAndDistrict.includes(word))) rank = 2;
    else return;

    matches.push({ congregation, rank, index });
  });

  return matches
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ congregation }) => congregation);
};
