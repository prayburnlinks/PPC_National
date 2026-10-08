import { collection, doc, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase-config';

const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Doc id for a district. Keyed by name — the same key CONGREGATIONS joins on —
// rather than the numeric `id`, which would shift if a district were ever
// added alphabetically.
export const districtDocId = slug;

// Key for a congregation inside its district doc's `pastors` map. A slug, not
// the raw name: names contain "/" and brackets (e.g. "HVG/Bloemfontein").
export const congregationKey = slug;

// What an admin has saved per district, keyed by districtDocId:
//   { board?: { chairperson, deputy, secretary, treasurer }, pastors?: { [congregationKey]: name } }
// A district nobody has edited is absent, so callers fall back to the defaults
// in constants/config.js. Throws on failure so the caller can tell "no edits
// yet" from "couldn't load".
export const getDistrictDetails = async () => {
  try {
    const snap = await getDocs(collection(db, 'districts'));
    const details = {};
    snap.docs.forEach(d => {
      const { board, pastors } = d.data();
      if (board || pastors) details[d.id] = { board, pastors };
    });
    return details;
  } catch (error) {
    console.error('Get district details error:', error);
    throw { message: 'Failed to load district details.' };
  }
};

// Admin: save several districts in one batch so a multi-district edit either
// fully lands or not at all. `changes` is [{ name, board?, pastors? }] — only
// the parts that changed. The merge keeps untouched pastors in place, so two
// admins editing different congregations in one district don't overwrite each
// other.
export const saveDistrictDetails = async (adminUser, changes) => {
  try {
    const batch = writeBatch(db);
    changes.forEach(({ name, board, pastors }) => {
      batch.set(
        doc(db, 'districts', districtDocId(name)),
        {
          name,
          ...(board && { board }),
          ...(pastors && { pastors }),
          updatedBy: adminUser.uid,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    });
    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Save district details error:', error);
    throw { message: error.message || 'Failed to save district details.' };
  }
};
