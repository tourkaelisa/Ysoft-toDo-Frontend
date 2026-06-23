// Βοηθητικά για ημερομηνίες ώστε να ΜΗΝ χάνεται μέρα λόγω timezone.
//
// Το Material datepicker δίνει Date στα ΤΟΠΙΚΑ μεσάνυχτα. Αν σταλεί ως έχει,
// το Angular το κάνει UTC ISO (Date.toJSON) και για ζώνες UTes+ "γυρίζει" μία
// μέρα πίσω. Εδώ το μετατρέπουμε σε τοπικό 'YYYY-MM-DD' πριν το στείλουμε.

function localYMD(d: Date): string {
  const month = ('0' + (d.getMonth() + 1)).slice(-2);
  const day = ('0' + d.getDate()).slice(-2);
  return `${d.getFullYear()}-${month}-${day}`;
}

/**
 * Επιστρέφει την ημερομηνία ως τοπικό 'YYYY-MM-DD'.
 * Δέχεται είτε Date (από το datepicker) είτε string (από τη βάση).
 */
export function toLocalYMD(value: any): string {
  if (!value) return '';

  // Ήδη σε μορφή 'YYYY-MM-DD' (όπως έρχεται από τη βάση) -> κράτησέ το αυτούσιο
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const d = new Date(value);
  if (isNaN(d.getTime())) return typeof value === 'string' ? value : '';
  return localYMD(d);
}
