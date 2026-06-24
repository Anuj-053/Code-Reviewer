const crypto = require('crypto');

/**
 * Returns the MD5 hash of the given string.
 * @param {string} str
 * @returns {string} hex MD5 hash
 */
function hashCode(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

module.exports = hashCode;
