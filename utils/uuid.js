// Générateur UUIDv4 pour trace_id
function generateUUIDv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Export pour modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateUUIDv4 };
} else {
  window.generateUUIDv4 = generateUUIDv4;
}