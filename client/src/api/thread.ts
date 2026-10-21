import { api } from './client';
import type { ThreadMessage } from './types';

export interface MessageInput {
    text: string;
    evidence: string[];
    isQuestion?: boolean;
}

const enc = (s: string) => encodeURIComponent(s);
const asBuyer = (token: string) => ({ 'x-buyer-token': token });

export const getBuyerMessages = (reference: string, token: string) =>
    api<{ messages: ThreadMessage[] }>(`/disputes/buyer/${enc(reference)}/messages`, { headers: asBuyer(token) }).then(
        (d) => d.messages
    );

export const postBuyerMessage = (reference: string, token: string, input: MessageInput) =>
    api(`/disputes/buyer/${enc(reference)}/messages`, { method: 'POST', headers: asBuyer(token), body: input });

export const getMessages = (id: string) =>
    api<{ messages: ThreadMessage[] }>(`/disputes/${id}/messages`, { auth: true }).then((d) => d.messages);

export const postMessage = (id: string, input: MessageInput) =>
    api(`/disputes/${id}/messages`, { method: 'POST', auth: true, body: input });