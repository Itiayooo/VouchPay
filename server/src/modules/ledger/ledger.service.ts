import { ILedgerEntry, LedgerEntry } from './ledger.model';

// Returns false if this exact entry was already recorded
export async function recordEntry(entry: ILedgerEntry): Promise<boolean> {
    try {
        await LedgerEntry.create(entry);
        return true;
    } catch (err: any) {
        if (err?.code === 11000) return false;
        throw err;
    }
}