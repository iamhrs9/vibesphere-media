const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const meetingSchema = new mongoose.Schema({
    roomName: String
});
const Meeting = mongoose.model('Meeting', meetingSchema);

async function fixMeetings() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        const meetings = await Meeting.find({ roomName: /vpaas-magic-cookie-vpaas-magic-cookie-/ });
        console.log(`Found ${meetings.length} broken meetings.`);

        for (const m of meetings) {
            const fixed = m.roomName.replace('vpaas-magic-cookie-vpaas-magic-cookie-', 'vpaas-magic-cookie-');
            console.log(`Fixing: ${m.roomName} -> ${fixed}`);
            m.roomName = fixed;
            await m.save();
        }

        console.log("Done fixing meetings.");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fixMeetings();
