const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vibesphere').then(async () => {
    const db = mongoose.connection.db;
    const adminusers = await db.collection('adminusers').find().toArray();
    console.log("AdminUsers in DB:", adminusers);
    process.exit(0);
});
