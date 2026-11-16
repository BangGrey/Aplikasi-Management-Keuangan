export const normalizeUsername=value=>typeof value==='string'?value.trim().toLowerCase():'';
export const validUsername=value=>/^[a-z][a-z0-9_]{2,23}$/.test(normalizeUsername(value));
export const usernameHint='3–24 karakter: diawali huruf, gunakan huruf, angka, atau underscore (_).';
