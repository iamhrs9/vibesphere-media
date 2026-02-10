const test = require('node:test');
const assert = require('node:assert');
const { sanitizeAmount, sanitizeCurrency } = require('../utils/paymentUtils');

test('sanitizeAmount should handle various currency strings', () => {
    assert.strictEqual(sanitizeAmount("$19"), 1900);
    assert.strictEqual(sanitizeAmount("₹399"), 39900);
    assert.strictEqual(sanitizeAmount("£10.50"), 1050);
});

test('sanitizeAmount should handle numbers', () => {
    assert.strictEqual(sanitizeAmount(19), 1900);
    assert.strictEqual(sanitizeAmount(399.5), 39950);
});

test('sanitizeAmount should handle commas', () => {
    assert.strictEqual(sanitizeAmount("1,234.56"), 123456);
});

test('sanitizeAmount should return 0 for invalid inputs', () => {
    assert.strictEqual(sanitizeAmount("abc"), 0);
    assert.strictEqual(sanitizeAmount(null), 0);
    assert.strictEqual(sanitizeAmount(undefined), 0);
    assert.strictEqual(sanitizeAmount(""), 0);
});

test('sanitizeAmount should handle decimals and rounding', () => {
    assert.strictEqual(sanitizeAmount("10.50"), 1050);
    assert.strictEqual(sanitizeAmount("0.99"), 99);
    assert.strictEqual(sanitizeAmount("1.001"), 100);
    assert.strictEqual(sanitizeAmount("1.009"), 101);
});

test('sanitizeCurrency should validate currency code', () => {
    assert.strictEqual(sanitizeCurrency("USD"), "USD");
    assert.strictEqual(sanitizeCurrency("INR"), "INR");
    assert.strictEqual(sanitizeCurrency("EUR"), "EUR");
});

test('sanitizeCurrency should return INR for invalid currency codes', () => {
    assert.strictEqual(sanitizeCurrency("US"), "INR");
    assert.strictEqual(sanitizeCurrency("USDT"), "INR");
    assert.strictEqual(sanitizeCurrency(""), "INR");
    assert.strictEqual(sanitizeCurrency(null), "INR");
    assert.strictEqual(sanitizeCurrency(undefined), "INR");
    assert.strictEqual(sanitizeCurrency(123), "INR");
});
