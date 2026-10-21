import { Schema, Types, model } from 'mongoose';

export interface IDisputeMessage {
    transaction: Types.ObjectId;
    authorRole: 'buyer' | 'vendor' | 'admin';
    author?: Types.ObjectId;
    text: string;
    evidence: string[];
    isQuestion: boolean;
    createdAt: Date;
}

const messageSchema = new Schema<IDisputeMessage>(
    {
        transaction: { type: Schema.Types.ObjectId, ref: 'Transaction', required: true, index: true },
        authorRole: { type: String, enum: ['buyer', 'vendor', 'admin'], required: true },
        author: { type: Schema.Types.ObjectId, ref: 'Vendor' },
        text: { type: String, required: true, trim: true, maxlength: 1500 },
        evidence: { type: [String], default: [] },
        isQuestion: { type: Boolean, default: false },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
        toJSON: {
            transform: (_doc, ret: Record<string, any>) => {
                ret.id = String(ret._id);
                ret.role = ret.authorRole;
                delete ret._id;
                delete ret.__v;
                delete ret.author; // never reveal which admin wrote it
                delete ret.authorRole;
                delete ret.transaction;
                return ret;
            },
        },
    }
);

// Messages are never edited or deleted, so the conversation stays a reliable record
export const DisputeMessage = model<IDisputeMessage>('DisputeMessage', messageSchema);