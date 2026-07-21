window.MT = window.MT || {};

// Morse dictionary + Koch learning order.
MT.morse = (function () {
  const MAP = {
    A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.',
    G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..',
    M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.',
    S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
    Y: '-.--', Z: '--..',
    '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
    '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
    '.': '.-.-.-', ',': '--..--', '?': '..--..', '/': '-..-.', '=': '-...-'
  };

  const REV = {};
  Object.keys(MAP).forEach((k) => { REV[MAP[k]] = k; });

  // Classic Koch order (letters first, then numbers/punctuation).
  const KOCH = [
    'K', 'M', 'R', 'S', 'U', 'A', 'P', 'T', 'L', 'O', 'W', 'I', 'N', 'J',
    'E', 'F', 'Y', 'V', 'G', 'Q', 'Z', 'H', 'B', 'C', 'D', 'X',
    '5', '4', '3', '2', '1', '6', '7', '8', '9', '0',
    '.', ',', '?', '/', '='
  ];

  // Full symbol set, in alphabetical / natural order.
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const DIGITS = '0123456789'.split('');
  const PUNCT = ['.', ',', '?', '/', '='];
  const ALPHA = LETTERS.concat(DIGITS, PUNCT);

  // Easy -> hard: sort by pattern length, then dash count, then alphabetically.
  // Naturally puts short letters (E, T, I, A...) first, digits/punctuation last.
  function difficulty(ch) {
    const p = MAP[ch];
    const dashes = (p.match(/-/g) || []).length;
    return p.length * 10 + dashes;
  }
  const EASY = ALPHA.slice().sort((a, b) => difficulty(a) - difficulty(b) || a.localeCompare(b));

  const ORDERS = { koch: KOCH, alpha: ALPHA, easy: EASY };
  const ORDER_LABELS = { koch: 'Koch', alpha: 'A–Z', random: 'Random', easy: 'Easy→Hard' };

  return {
    MAP,
    REV,
    KOCH,
    ORDERS,
    ORDER_LABELS,
    difficulty,
    encode: (ch) => MAP[String(ch).toUpperCase()] || '',
    decode: (pat) => REV[pat] || ''
  };
})();
