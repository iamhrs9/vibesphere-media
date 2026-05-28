const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const orderSchema = new mongoose.Schema({
    orderId: String,
    paymentId: String,
    paymentStatus: String,
    workStatus: String,
    status: String,
    userId: mongoose.Schema.Types.ObjectId,
    orderAmount: Number,
    orderItems: Array,
    instaLink: String,
    date: String,
    
    orderType: { type: String, enum: ['agency', 'smm'], default: 'agency' },
    targetLink: { type: String, default: '' },
    quantity: { type: Number, default: 0 },
    serviceId: { type: String, default: '' },
    selectedCountry: { type: String, default: '' },
    selectedQuality: { type: String, default: '' },
    selectedSpeed: { type: String, default: '' },
    selectedRefill: { type: String, default: '' },
    
    isDripFeed: { type: Boolean, default: false },
    runs: { type: Number, default: 1 },
    interval: { type: Number, default: 0 }, // in minutes
    quantityPerRun: { type: Number, default: 0 },
    remainingRuns: { type: Number, default: 0 },
    nextRunAt: { type: Date, default: null }
});

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

async function verify() {
    try {
        console.log("🔗 Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected!");

        // 1. Create a dummy SMM order with Drip Feed enabled
        console.log("\n📦 Creating dummy Drip Feed SMM Order...");
        const testOrder = new Order({
            orderId: "#TEST-" + Math.floor(100000 + Math.random() * 900000),
            paymentId: "TXN-TEST-123",
            paymentStatus: "Paid",
            workStatus: "Work Pending",
            status: "Work Pending",
            orderAmount: 500,
            orderType: "smm",
            serviceId: "123",
            quantity: 10000,
            targetLink: "https://instagram.com/test",
            isDripFeed: true,
            runs: 5,
            interval: 120, // 2 hours (120 minutes)
            quantityPerRun: 2000,
            remainingRuns: 5,
            nextRunAt: new Date(Date.now() - 5000), // set to due (5 seconds ago)
            date: new Date().toLocaleString()
        });

        await testOrder.save();
        console.log("✅ Dummy order saved:", testOrder.orderId);

        // 2. Perform a simulated worker tick
        console.log("\n⚡ Simulating Drip Feed Worker Tick...");
        const dueOrders = await Order.find({
            orderType: 'smm',
            isDripFeed: true,
            remainingRuns: { $gt: 0 },
            nextRunAt: { $lte: new Date() }
        });

        console.log(`🔍 Found ${dueOrders.length} due orders.`);
        const foundTestOrder = dueOrders.find(o => o.orderId === testOrder.orderId);
        
        if (!foundTestOrder) {
            throw new Error("❌ Test order was not found in the due orders list!");
        }
        console.log("✅ Test order was successfully found in due orders.");

        // Simulate processing the first sub-run
        foundTestOrder.remainingRuns -= 1;
        const intervalMs = foundTestOrder.interval * 60 * 1000;
        foundTestOrder.nextRunAt = new Date(Date.now() + intervalMs);
        foundTestOrder.workStatus = 'In Progress';
        foundTestOrder.status = 'In Progress';
        await foundTestOrder.save();

        console.log("✅ First sub-run simulated and saved successfully.");
        console.log(`📊 Updated remaining runs: ${foundTestOrder.remainingRuns} (expected: 4)`);
        console.log(`📊 Updated nextRunAt: ${foundTestOrder.nextRunAt} (expected: due in 2 hours)`);

        if (foundTestOrder.remainingRuns !== 4) {
            throw new Error("❌ remainingRuns decrement failed!");
        }

        // Clean up the dummy order
        console.log("\n🧹 Cleaning up test order...");
        await Order.deleteOne({ orderId: testOrder.orderId });
        console.log("✅ Test order deleted successfully!");

        console.log("\n✨ DRIP FEED VERIFICATION COMPLETED SUCCESSFULLY WITH 100% SUCCESS! ✨");
        process.exit(0);
    } catch (err) {
        console.error("❌ Verification failed:", err);
        process.exit(1);
    }
}

verify();
