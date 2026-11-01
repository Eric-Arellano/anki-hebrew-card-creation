// The prepositions (מילות יחס) a verb commonly governs, roughly by frequency. Hebrew grammar counts
// את, which marks a definite direct object, among them, and the production answer keeps it:
// `לראות את`. אל, אחרי, בפני and מפני are left out: after a verb they are rare or formal, and the
// deck is a beginner's.
export const GOVERNED_PREPOSITIONS = ['את', 'ל', 'ב', 'על', 'עם', 'מ'] as const;

export type GovernedPreposition = (typeof GOVERNED_PREPOSITIONS)[number];
