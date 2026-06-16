/**
 * Curated sentence pairs from a 34K Sinhala↔English↔Singlish parallel corpus.
 * Used as few-shot examples for the slang normalizer to improve translation accuracy.
 */

export interface SentencePair {
  singlish: string;
  english: string;
  category: string;
}

export const SENTENCE_PAIRS: SentencePair[] = [
  { singlish: "oya kohomada mama hondin metto", english: "how are you fixed i m okay matt ", category: "greeting" },
  { singlish: "hayi oyata kohomada denenne mama heena dekka kiyala", english: "hi how are you feeling i was dreaming ", category: "greeting" },
  { singlish: "eya kiwwa ow dewiyanta sthuthiyi kiyala", english: "she said yes thank god ", category: "courtesy" },
  { singlish: "pradhaniyata kiyanna api ohuta sthuthi karanawa pradhaniya dannawa", english: "tell the chief we thank him chief knows ", category: "courtesy" },
  { singlish: "mata kanagatuyi namuth gal owun ma samanga etha", english: "i m sorry but the stones they are with me ", category: "apology" },
  { singlish: "mata kanagatuyi meya polis palana kriyawak", english: "i m sorry this is a police control action ", category: "apology" },
  { singlish: "samawenna oyata ona eka neda", english: "excuse me that s what you want isn t it ", category: "request" },
  { singlish: "mata oya ekka yanna ona welawak eyi", english: "i want to go with you there ll be a time ", category: "request" },
  { singlish: "eyi oyata mawa awashya wenne eyi", english: "why why would you need me because ", category: "request" },
  { singlish: "saha murapola oba sathutuyi ow sar", english: "and outpost you re happy there yes sir ", category: "emotion" },
  { singlish: "mama e kar ekata adareyi oyala denna gena mama godak sathutuyi", english: "i love that car i m very happy for you two ", category: "emotion" },
  { singlish: "ane amme eka nawaththanna meka dukak witharayi", english: "aw shucks ma am stop it this is just sad ", category: "emotion" },
  { singlish: "ohuta therenawa ohu udaw karanne deyi wimasanna", english: "he understands ask him if he will help ", category: "request" },
  { singlish: "oya koheda hitiye ne thaththe", english: "where ve you been nowhere hi daddy ", category: "question" },
  { singlish: "thaththe mama saha oya koheda yanne", english: "daddy i and where re you going ", category: "question" },
  { singlish: "me magula ahanawada mona magulakda", english: "do you listen to this crap what crap ", category: "question" },
  { singlish: "monatharam honda dewalda eththa oba", english: "what good stuff the real you ", category: "positive" },
  { singlish: "ow den honda kalayak neweyi", english: "yeah now s not a good time alright ", category: "positive" },
  { singlish: "hayi lassanayi jesuni ehema karanna epa", english: "hi beautiful jesus don t do that ", category: "compliment" },
  { singlish: "wada lassanayi", english: "just better beautiful ", category: "compliment" },
  { singlish: "feks yanthra mata samawenna", english: "the fax machines excuse me ", category: "courtesy" },
  { singlish: "ow thaththe bayi den petiyo", english: "yes daddy bye bye now sweetheart ", category: "farewell" },
  { singlish: "ayubowan den sonduriya samuganna thaththe", english: " bye bye now sweetheart goodbye daddy ", category: "farewell" },
  { singlish: "hariyatama adaraya wage", english: " like love exactly ", category: "emotion" },
  { singlish: "owun karanne owun karanne nehe", english: "they do to they do not ", category: "general" },
  { singlish: "eya hondin mama ese balaporoththu wemi", english: "she okay i hope so ", category: "general" },
  { singlish: "eya wada mila adhikayi", english: "it s moreexpensive ", category: "general" },
  { singlish: "heyi mihiri kammul hayi joyi", english: "hey sweet cheeks hi joey ", category: "general" },
  { singlish: "mata awashya oba mawa pihitewwa", english: "you set me up i just wanted ", category: "general" },
];