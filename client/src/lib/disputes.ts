export const REASONS: Record<string, string> = {
    not_as_described: 'Not as described',
    wrong_item: 'Wrong item',
    damaged: 'Damaged',
    fake: 'Fake or counterfeit',
    not_received: 'Never received it',
    changed_mind: 'Changed their mind',
    other: 'Something else',
};

export const RESOLUTIONS: Record<string, string> = {
    refund_full: 'Refunded to the buyer in full',
    refund_keep_delivery: 'Refunded to the buyer, and the seller keeps the delivery fee',
    release_full: 'Released to the seller in full',
    split: 'Split between the seller and the buyer',
};