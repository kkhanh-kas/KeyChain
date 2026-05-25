// Mock data + procedural cover art for KeyChain
// Cover art is generated SVG (qinghua porcelain palette) until real assets are dropped in.

const GAMES = [
  { id: 'g01', title: 'Lantern of the Drifting Capital', genre: 'RPG', vendor: 'Studio Inkwell', price: 480, tokenSuffix: '0042', royalty: 8, art: 'lantern',
    blurb: 'A turn-based odyssey through a city that exists only at dusk.',
    desc: 'You arrive at a port that the tide has not touched in a hundred years. The harbour-master gives you a brass key, says nothing, and turns away. What follows is a journey through ninety-nine wards, each one a forgotten chapter of a city built on memory. Combat is patient. Conversations are longer.' },
  { id: 'g02', title: 'Plain Sailing', genre: 'Sim', vendor: 'Hai Salt', price: 320, tokenSuffix: '0099', royalty: 5, art: 'wave',
    blurb: 'Build a fleet, read the weather, retire wealthy or do not retire at all.',
    desc: 'Plain Sailing is a slow trade simulator set across a fictional Ming-dynasty merchant route. There is no combat. Your competition is the monsoon, your colleagues, and your own ambition. Comes with a 240-page in-game almanac.' },
  { id: 'g03', title: 'Crow & Crown', genre: 'Strategy', vendor: 'Bell Tower Games', price: 540, tokenSuffix: '0134', royalty: 10, art: 'crow',
    blurb: 'Diplomacy by birdsong. One kingdom, six advisors, no map.',
    desc: 'You inherit a country you have never visited. Every morning a different crow lands on the windowsill with a different version of the news. Decide who to believe. The cabinet meets at noon.' },
  { id: 'g04', title: 'Threadbare', genre: 'Puzzle', vendor: 'Loose Knot', price: 220, tokenSuffix: '0210', royalty: 7, art: 'thread',
    blurb: 'Sew the constellations back together before the night ends.',
    desc: 'A meditative needlework puzzle. Each level is a star-map you must complete using a finite length of silver thread. There is no failure state. There is also no save button.' },
  { id: 'g05', title: 'Sundown Atelier', genre: 'Life-sim', vendor: 'Pearl Workshop', price: 410, tokenSuffix: '0288', royalty: 6, art: 'atelier',
    blurb: 'Run a tea-room above a printing press in 1920s Shanghai.',
    desc: 'Hand-paint advertising posters by day, host poets by night, balance your books on Sundays. Sundown Atelier rewards patience and a willingness to remember every customer\'s name.' },
  { id: 'g06', title: 'The Iron Garden', genre: 'Action', vendor: 'Bronze Foundry', price: 600, tokenSuffix: '0301', royalty: 9, art: 'iron',
    blurb: 'A garden made of weapons. The flowers fight back.',
    desc: 'Side-scrolling combat in a forbidden imperial garden where every plant has been forged from confiscated swords. Bring your own shears.' },
  { id: 'g07', title: 'Quiet Calligraphy Club', genre: 'Cozy', vendor: 'Studio Inkwell', price: 180, tokenSuffix: '0344', royalty: 5, art: 'calligraphy',
    blurb: 'After-school brush practice with seven very strange friends.',
    desc: 'A short visual novel about a school calligraphy club where the homework occasionally becomes a window into another dimension. Three endings. No exams.' },
  { id: 'g08', title: 'Marble Provinces', genre: '4X', vendor: 'Bell Tower Games', price: 720, tokenSuffix: '0421', royalty: 12, art: 'marble',
    blurb: 'A grand-strategy game played on a single chessboard the size of a continent.',
    desc: 'Marble Provinces compresses three centuries of empire into a board of 64 squares. Each turn lasts an in-game decade. Each piece has a biography.' },
  { id: 'g09', title: 'Tea Roads', genre: 'Adventure', vendor: 'Hai Salt', price: 380, tokenSuffix: '0488', royalty: 7, art: 'tea',
    blurb: 'Twelve caravans. One mountain. Sixty cups.',
    desc: 'Tea Roads is a slow point-and-click about leading a tea caravan from Yunnan to Lhasa. The mountain is the antagonist. Hospitality is the resolution.' },
];

// Used in marketplace: same shape but with seller and asking price
const MARKETPLACE_LISTINGS = GAMES.slice(0, 7).map((g, i) => ({
  ...g,
  listingId: `L${1000 + i}`,
  seller: `0x${(0xa10b + i * 17).toString(16)}…${(0xc0de + i).toString(16)}`,
  askPrice: Math.round(g.price * (0.65 + (i * 0.07))),
  daysListed: (i * 3 + 2),
  resale: true,
}));

// Owned library — small initial inventory
const LIBRARY_INITIAL = [
  { ...GAMES[0], tokenId: '#0042', purchaseDate: '2026-05-20', status: 'active', machineHash: '0x7a4b…f201', license: 'Perpetual' },
  { ...GAMES[3], tokenId: '#0210', purchaseDate: '2026-05-18', status: 'inactive', license: 'Perpetual' },
  { ...GAMES[6], tokenId: '#0344', purchaseDate: '2026-04-29', status: 'listed', askPrice: 150, license: 'Perpetual' },
];

window.KC_DATA = { GAMES, MARKETPLACE_LISTINGS, LIBRARY_INITIAL };
