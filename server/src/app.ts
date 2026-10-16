import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorHandler, notFound } from './middleware/error.middleware';
import authRoutes from './modules/auth/auth.routes';
import transactionRoutes from './modules/transactions/transaction.routes';
import paymentRoutes from './modules/payments/payment.routes';
import handoverRoutes from './modules/handover/handover.routes';
import payoutRoutes from './modules/payouts/payout.routes'

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(
    express.json({
        verify: (req, _res, buf) => {
            (req as any).rawBody = buf;
        },
    })
);
app.use(
    rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 200,
        standardHeaders: true,
        legacyHeaders: false,
    })
);
app.use('/api/transactions', transactionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/handover', handoverRoutes);
app.use('/api/payouts', payoutRoutes);


app.get('/api/health', (_req, res) => {
    res.json({ success: true, service: 'vouchpay-api', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;