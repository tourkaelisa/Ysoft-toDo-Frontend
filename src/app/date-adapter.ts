// Κοινός date adapter & formats για όλα τα Material datepickers (εγγραφή, προφίλ, admin).
// Επιβάλλει εμφάνιση DD/MM/YYYY στο input και ελληνικό ημερολόγιο.

import { Injectable } from '@angular/core';
import { NativeDateAdapter } from '@angular/material/core';

@Injectable()
export class CustomDateAdapter extends NativeDateAdapter {
  override format(date: Date, displayFormat: Object): string {
    if (displayFormat === 'input') {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`; // Αυτό αναγκάζει το input να δείξει DD/MM/YYYY
    }
    return date.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' });
  }
}

export const MY_DATE_FORMATS = {
  parse: {
    dateInput: { month: 'short', year: 'numeric', day: 'numeric' },
  },
  display: {
    dateInput: 'input',
    monthYearLabel: { year: 'numeric', month: 'short' },
    dateA11yLabel: { year: 'numeric', month: 'long', day: 'numeric' },
    monthYearA11yLabel: { year: 'numeric', month: 'long' },
  },
};
