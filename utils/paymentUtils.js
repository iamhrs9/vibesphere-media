/**
 * Sanitizes the amount string/number and converts it to paise (integer).
 * @param {string|number} amount
 * @returns {number} Amount in paise
 */
function sanitizeAmount(amount) {
    if (amount === null || amount === undefined) {
        return 0;
    }
    // Remove everything except digits and decimal point
    let cleanAmount = amount.toString().replace(/[^\d.]/g, '');
    let parsed = parseFloat(cleanAmount);
    if (isNaN(parsed)) {
        return 0;
    }
    // Use toFixed(2) to handle floating point precision issues (e.g., 1.005 * 100 = 100.49999999999999)
    // before converting to the smallest currency unit (paise).
    return Math.round(parseFloat(parsed.toFixed(2)) * 100);
}

/**
 * Validates and returns the currency code.
 * @param {string} currency
 * @returns {string} 3-letter currency code, defaults to "INR"
 */
function sanitizeCurrency(currency) {
    return (currency && typeof currency === 'string' && currency.length === 3) ? currency : "INR";
}

module.exports = { sanitizeAmount, sanitizeCurrency };
