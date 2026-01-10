import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../src/models/user.model.js'; // Adjust path as needed

const ADMIN_EMAIL = 'dayton.g.japaryo@sekolahbim.sch.id';

const makeAdmin = async () => {
    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI is not defined");
    }

    try {
        console.log("Connecting to database...");
        await mongoose.connect(process.env.MONGO_URI);

        console.log(`Finding user with email: ${ADMIN_EMAIL}`);
        const user = await User.findOneAndUpdate(
            { email: ADMIN_EMAIL },
            { $set: { role: 'admin' } },
            { new: true } // Return the updated document
        );

        if (user) {
            console.log("Success! User is now an admin:");
            console.log(user);
        } else {
            console.error(`Error: User with email ${ADMIN_EMAIL} not found.`);
        }
    } catch (error) {
        console.error("An error occurred:", error);
    } finally {
        await mongoose.disconnect();
        console.log("Database connection closed.");
    }
};

void makeAdmin();