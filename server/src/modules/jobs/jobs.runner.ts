import { autoRelease, expireUnpaid, logAttention, reconcileMoney, refundUnshipped, remindBuyers } from './jobs.service';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

const jobs = [
    { name: 'expire-unpaid', everyMs: 10 * MIN, run: expireUnpaid },
    { name: 'auto-release', everyMs: 10 * MIN, run: autoRelease },
    { name: 'release-reminder', everyMs: 30 * MIN, run: remindBuyers },
    { name: 'refund-unshipped', everyMs: HOUR, run: refundUnshipped },
    { name: 'reconcile-money', everyMs: 5 * MIN, run: reconcileMoney },
    { name: 'needs-attention', everyMs: HOUR, run: logAttention },
];

export function startJobs() {
    if (process.env.DISABLE_JOBS === 'true') {
        console.log('Background jobs disabled');
        return;
    }
    for (const job of jobs) {
        let running = false; // never let a slow run overlap itself
        const tick = async () => {
            if (running) return;
            running = true;
            try {
                await job.run();
            } catch (err) {
                console.error(`[jobs] ${job.name} crashed`, err);
            } finally {
                running = false;
            }
        };
        setTimeout(tick, 30 * 1000).unref(); // first run 30s after boot
        setInterval(tick, job.everyMs).unref();
    }
    console.log(`Background jobs started (${jobs.length})`);
}