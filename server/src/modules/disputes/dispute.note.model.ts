import { Schema, Types, model } from 'mongoose';

export interface IDisputeNote {
    transaction: Types.ObjectId;
    author: Types.ObjectId;
    kind: 'note' | 'escalated' | 'deescalated';
    text: string;
    createdAt: Date;
}

const noteSchema = new Schema<IDisputeNote>(
    {
        transaction: { type: Schema.Types.ObjectId, ref: 'Transaction', required: true, index: true },
        author: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
        kind: { type: String, enum: ['note', 'escalated', 'deescalated'], default: 'note' },
        text: { type: String, required: true, trim: true, maxlength: 2000 },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
        toJSON: {
            transform: (_doc, ret: Record<string, any>) => {
                ret.id = String(ret._id);
                delete ret._id;
                delete ret.__v;
                return ret;
            },
        },
    }
);

// Notes are never edited or deleted, so they stay a reliable record
export const DisputeNote = model<IDisputeNote>('DisputeNote', noteSchema);