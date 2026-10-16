import 'dotenv/config';
import app from './app';
import { connectDB } from './config/db';

const PORT = process.env.PORT || 5000;

async function start() {
    await connectDB();
    app.listen(PORT, () => console.log(`VouchPay API running on port ${PORT}`));
}

start().catch((err) => {
    console.error('Failed to start server', err);
    process.exit(1);
});