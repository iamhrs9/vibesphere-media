const bcrypt = require('bcryptjs');

async function testAuth() {
    console.log("--- Testing Password Hashing ---");
    const password = "testPassword123";
    const hashed = await bcrypt.hash(password, 10);
    console.log("Hashed:", hashed);

    const match = await bcrypt.compare(password, hashed);
    console.log("Match:", match);

    if (match) {
        console.log("✅ Password hashing verification passed!");
    } else {
        console.error("❌ Password hashing verification failed!");
        process.exit(1);
    }
}

testAuth();
