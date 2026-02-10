const test = require('node:test');
const assert = require('node:assert');
const { checkAuth } = require('../middleware/auth');

test('checkAuth middleware', async (t) => {
    await t.test('should call next() if authorization token is correct', () => {
        const req = {
            headers: {
                'authorization': 'SECRET_VIBESPHERE_KEY_123'
            }
        };
        const res = {};
        let nextCalled = false;
        const next = () => {
            nextCalled = true;
        };

        checkAuth(req, res, next);

        assert.strictEqual(nextCalled, true);
    });

    await t.test('should return 403 if authorization token is missing', () => {
        const req = {
            headers: {}
        };
        let statusSet = 0;
        let jsonSent = null;
        const res = {
            status: (code) => {
                statusSet = code;
                return {
                    json: (data) => {
                        jsonSent = data;
                    }
                };
            }
        };
        const next = () => {
            assert.fail('next() should not be called');
        };

        checkAuth(req, res, next);

        assert.strictEqual(statusSet, 403);
        assert.deepStrictEqual(jsonSent, { error: "Access Denied" });
    });

    await t.test('should return 403 if authorization token is incorrect', () => {
        const req = {
            headers: {
                'authorization': 'WRONG_TOKEN'
            }
        };
        let statusSet = 0;
        let jsonSent = null;
        const res = {
            status: (code) => {
                statusSet = code;
                return {
                    json: (data) => {
                        jsonSent = data;
                    }
                };
            }
        };
        const next = () => {
            assert.fail('next() should not be called');
        };

        checkAuth(req, res, next);

        assert.strictEqual(statusSet, 403);
        assert.deepStrictEqual(jsonSent, { error: "Access Denied" });
    });
});
