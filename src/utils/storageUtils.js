// Safe wrappers around localStorage / sessionStorage.
// Centralises JSON serialisation and quota-exceeded handling.

const read = (storage, key, defaultValue = null) => {
  try {
    const raw = storage.getItem(key);
    return raw !== null ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const write = (storage, key, value) => {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn(`[storage] write failed for "${key}":`, e.message);
    return false;
  }
};

const remove = (storage, key) => {
  try { storage.removeItem(key); } catch { /* ignore */ }
};

// localStorage helpers
export const localGet  = (key, def)   => read(localStorage,   key, def);
export const localSet  = (key, value) => write(localStorage,  key, value);
export const localDel  = (key)        => remove(localStorage, key);

// sessionStorage helpers
export const sessionGet  = (key, def)   => read(sessionStorage,   key, def);
export const sessionSet  = (key, value) => write(sessionStorage,  key, value);
export const sessionDel  = (key)        => remove(sessionStorage, key);
