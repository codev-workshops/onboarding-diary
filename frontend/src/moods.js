export const MOODS = [
  { value: 'happy', label: 'Happy', emoji: '\u{1F60A}' },
  { value: 'productive', label: 'Productive', emoji: '\u{1F680}' },
  { value: 'confused', label: 'Confused', emoji: '\u{1F615}' },
  { value: 'overwhelmed', label: 'Overwhelmed', emoji: '\u{1F635}' },
  { value: 'excited', label: 'Excited', emoji: '\u{1F389}' },
];

export const moodEmoji = (mood) => {
  const found = MOODS.find((m) => m.value === mood);
  return found ? found.emoji : '\u{1F4DD}';
};
