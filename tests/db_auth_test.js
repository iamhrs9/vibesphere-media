const mongoose = require('mongoose');
const MONGO_URI = "";
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    resetOtp: String,
    resetOtpExpiry: Date
});
const User = mongoose.model('TestUserAuth', userSchema);

async function runTests() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("✅ DB Connected");

        const testEmail = "test_reset@example.com";
        const testPass = "myPassword123";

        // 1. Create User
        await User.deleteOne({ email: testEmail });
        const hashedP = await bcrypt.hash(testPass, 10);
        const u = new User({ name: "Test User", email: testEmail, password: hashedP });
        await u.save();
        console.log("✅ User Created");

        // 2. Change Password
        const newPass = "newPassword456";
        const isMatch = await bcrypt.compare(testPass, u.password);
        if (isMatch) {
            u.password = await bcrypt.hash(newPass, 10);
            await u.save();
            console.log("✅ Password Changed");
        } else {
            console.log("❌ Password Mismatch");
        }

        // 3. Forgot Password OTP Generation
        const otp = "123456";
        u.resetOtp = await bcrypt.hash(otp, 10);
        u.resetOtpExpiry = new Date(Date.now() + 15 * 60 * 1000);
        await u.save();
        console.log("✅ OTP Generated & Saved");

        // 4. Reset Password
        const resetMatch = await bcrypt.compare(otp, u.resetOtp);
        if (resetMatch && u.resetOtpExpiry > Date.now()) {
            u.password = await bcrypt.hash("resetPass789", 10);
            u.resetOtp = undefined;
            u.resetOtpExpiry = undefined;
            await u.save();
            console.log("✅ Password Reset via OTP");
        } else {
            console.log("❌ OTP Verification Failed");
        }

        await mongoose.disconnect();
        console.log("✅ Tests Completed");

    } catch (e) {
        console.error("❌ Test Failed:", e);
    }
}

runTests();
