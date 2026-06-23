// Κοινοί έλεγχοι εγκυρότητας (ίδιοι με τη φόρμα εγγραφής),
// ώστε να χρησιμοποιούνται παντού: εγγραφή, προφίλ, φόρμα admin.

export const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test((email || '').trim());
}

// Ελάχιστο μήκος κωδικού
export const PASSWORD_MIN_LENGTH = 4;

export function isValidPassword(password: string): boolean {
  return (password || '').trim().length >= PASSWORD_MIN_LENGTH;
}
