// Indian Standard Time utility functions

export const IST_TIMEZONE = 'Asia/Kolkata';

// Get current date/time in IST
export const getCurrentDateIST = () => {
  return new Date(new Date().toLocaleString("en-US", { timeZone: IST_TIMEZONE }));
};

// Format date for IST display
export const formatDateIST = (date, options = {}) => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-IN', {
    timeZone: IST_TIMEZONE,
    ...options
  });
};

// Format datetime for IST display
export const formatDateTimeIST = (date, options = {}) => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString('en-IN', {
    timeZone: IST_TIMEZONE,
    ...options
  });
};

// Check if date is today in IST
export const isTodayIST = (date) => {
  if (!date) return false;
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const today = getCurrentDateIST();
  return dateObj.toDateString() === today.toDateString();
};

// Check if date is in the past in IST
export const isPastDateIST = (date) => {
  if (!date) return false;
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const today = getCurrentDateIST();
  today.setHours(0, 0, 0, 0);
  dateObj.setHours(0, 0, 0, 0);
  return dateObj < today;
};

// Format time for input fields (YYYY-MM-DDTHH:mm format for datetime-local)
export const formatForDateTimeInput = (date) => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  // Convert to IST and format
  const istDate = new Date(dateObj.toLocaleString("en-US", { timeZone: IST_TIMEZONE }));
  return istDate.toISOString().slice(0, 16);
};

// Format date for input fields (YYYY-MM-DD format)
export const formatForDateInput = (date) => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  // Convert to IST and format
  const istDate = new Date(dateObj.toLocaleString("en-US", { timeZone: IST_TIMEZONE }));
  return istDate.toISOString().slice(0, 10);
};

// Get relative time (e.g., "2 hours ago", "in 3 days")
export const getRelativeTimeIST = (date) => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = getCurrentDateIST();
  const diffMs = dateObj - now;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (Math.abs(diffMinutes) < 60) {
    if (diffMinutes === 0) return 'now';
    return diffMinutes > 0 ? `in ${diffMinutes} minutes` : `${Math.abs(diffMinutes)} minutes ago`;
  } else if (Math.abs(diffHours) < 24) {
    return diffHours > 0 ? `in ${diffHours} hours` : `${Math.abs(diffHours)} hours ago`;
  } else {
    return diffDays > 0 ? `in ${diffDays} days` : `${Math.abs(diffDays)} days ago`;
  }
};