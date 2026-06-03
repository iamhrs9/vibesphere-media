const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const db = mongoose.connection.db;
    const adminusers = await db.collection('adminusers').find().toArray();
    console.log("AdminUsers in DB:", adminusers);
    
    // Check if there are other collections
    const cols = await db.listCollections().toArray();
    console.log("Collections:", cols.map(c => c.name));
    process.exit(0);
});
