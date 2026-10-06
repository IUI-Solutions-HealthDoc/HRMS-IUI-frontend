// Client-side mirror of sangi-fastapi/app/limits.py. Server is the authority.
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_UPLOAD_MB = MAX_UPLOAD_BYTES / (1024 * 1024);

export const WORD_LIMITS = {
  subject: 15,
  description: 500,
  default_text: 500,
};

export function countWords(text) {
  return (text || "").trim().split(/\s+/).filter(Boolean).length;
}

// Returns an error string, or "" when the file is acceptable.
export function validateFile(file) {
  if (file && file.size > MAX_UPLOAD_BYTES) {
    return `"${file.name}" is larger than ${MAX_UPLOAD_MB}MB. Please choose a smaller file.`;
  }
  return "";
}
