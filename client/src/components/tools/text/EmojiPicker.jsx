import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const EMOJIS = [
  // Smileys
  {e:'😀',n:'grinning face',c:'Smileys'},{e:'😃',n:'grinning face big eyes',c:'Smileys'},{e:'😄',n:'grinning face smiling eyes',c:'Smileys'},{e:'😁',n:'beaming face',c:'Smileys'},{e:'😆',n:'grinning squinting',c:'Smileys'},{e:'😅',n:'grinning sweat',c:'Smileys'},{e:'🤣',n:'rolling on floor laughing',c:'Smileys'},{e:'😂',n:'face tears of joy',c:'Smileys'},{e:'🙂',n:'slightly smiling',c:'Smileys'},{e:'🙃',n:'upside down',c:'Smileys'},{e:'😉',n:'winking',c:'Smileys'},{e:'😊',n:'smiling eyes',c:'Smileys'},{e:'😇',n:'smiling halo',c:'Smileys'},{e:'🥰',n:'smiling hearts',c:'Smileys'},{e:'😍',n:'heart eyes',c:'Smileys'},{e:'🤩',n:'star struck',c:'Smileys'},{e:'😘',n:'face blowing kiss',c:'Smileys'},{e:'😗',n:'kissing',c:'Smileys'},{e:'😚',n:'kissing closed eyes',c:'Smileys'},{e:'😙',n:'kissing smiling eyes',c:'Smileys'},{e:'🥲',n:'smiling tear',c:'Smileys'},{e:'😋',n:'face savoring food',c:'Smileys'},{e:'😛',n:'face tongue',c:'Smileys'},{e:'😜',n:'winking tongue',c:'Smileys'},{e:'🤪',n:'zany face',c:'Smileys'},{e:'😝',n:'squinting tongue',c:'Smileys'},{e:'🤑',n:'money mouth',c:'Smileys'},{e:'🤗',n:'hugging',c:'Smileys'},{e:'🤭',n:'hand over mouth',c:'Smileys'},{e:'🤫',n:'shushing',c:'Smileys'},{e:'🤔',n:'thinking',c:'Smileys'},{e:'🤐',n:'zipper mouth',c:'Smileys'},{e:'🤨',n:'raised eyebrow',c:'Smileys'},{e:'😐',n:'neutral face',c:'Smileys'},{e:'😑',n:'expressionless',c:'Smileys'},{e:'😶',n:'no mouth',c:'Smileys'},{e:'😏',n:'smirking',c:'Smileys'},{e:'😒',n:'unamused',c:'Smileys'},{e:'🙄',n:'rolling eyes',c:'Smileys'},{e:'😬',n:'grimacing',c:'Smileys'},
  // People
  {e:'👋',n:'waving hand',c:'People'},{e:'🤚',n:'raised back hand',c:'People'},{e:'🖐',n:'hand fingers splayed',c:'People'},{e:'✋',n:'raised hand',c:'People'},{e:'🖖',n:'vulcan salute',c:'People'},{e:'👌',n:'ok hand',c:'People'},{e:'🤌',n:'pinched fingers',c:'People'},{e:'✌️',n:'victory hand',c:'People'},{e:'🤞',n:'crossed fingers',c:'People'},{e:'🤟',n:'love you gesture',c:'People'},{e:'🤘',n:'sign of horns',c:'People'},{e:'👈',n:'backhand index left',c:'People'},{e:'👉',n:'backhand index right',c:'People'},{e:'👆',n:'backhand index up',c:'People'},{e:'👇',n:'backhand index down',c:'People'},{e:'☝️',n:'index pointing up',c:'People'},{e:'👍',n:'thumbs up',c:'People'},{e:'👎',n:'thumbs down',c:'People'},{e:'✊',n:'raised fist',c:'People'},{e:'👊',n:'oncoming fist',c:'People'},{e:'🤛',n:'left facing fist',c:'People'},{e:'🤜',n:'right facing fist',c:'People'},{e:'👏',n:'clapping hands',c:'People'},{e:'🙌',n:'raising hands',c:'People'},{e:'👐',n:'open hands',c:'People'},{e:'🤲',n:'palms up',c:'People'},{e:'🙏',n:'folded hands',c:'People'},{e:'✍️',n:'writing hand',c:'People'},{e:'💅',n:'nail polish',c:'People'},{e:'🤳',n:'selfie',c:'People'},
  // Animals
  {e:'🐶',n:'dog',c:'Animals'},{e:'🐱',n:'cat',c:'Animals'},{e:'🐭',n:'mouse',c:'Animals'},{e:'🐹',n:'hamster',c:'Animals'},{e:'🐰',n:'rabbit',c:'Animals'},{e:'🦊',n:'fox',c:'Animals'},{e:'🐻',n:'bear',c:'Animals'},{e:'🐼',n:'panda',c:'Animals'},{e:'🐨',n:'koala',c:'Animals'},{e:'🐯',n:'tiger',c:'Animals'},{e:'🦁',n:'lion',c:'Animals'},{e:'🐮',n:'cow',c:'Animals'},{e:'🐷',n:'pig',c:'Animals'},{e:'🐸',n:'frog',c:'Animals'},{e:'🐵',n:'monkey',c:'Animals'},{e:'🐔',n:'chicken',c:'Animals'},{e:'🐧',n:'penguin',c:'Animals'},{e:'🐦',n:'bird',c:'Animals'},{e:'🦆',n:'duck',c:'Animals'},{e:'🦅',n:'eagle',c:'Animals'},{e:'🦉',n:'owl',c:'Animals'},{e:'🦋',n:'butterfly',c:'Animals'},{e:'🐛',n:'bug',c:'Animals'},{e:'🐝',n:'honeybee',c:'Animals'},{e:'🐢',n:'turtle',c:'Animals'},{e:'🐍',n:'snake',c:'Animals'},{e:'🦎',n:'lizard',c:'Animals'},{e:'🦖',n:'t-rex',c:'Animals'},{e:'🐳',n:'whale',c:'Animals'},{e:'🐬',n:'dolphin',c:'Animals'},
  // Food
  {e:'🍎',n:'red apple',c:'Food'},{e:'🍊',n:'tangerine',c:'Food'},{e:'🍋',n:'lemon',c:'Food'},{e:'🍇',n:'grapes',c:'Food'},{e:'🍓',n:'strawberry',c:'Food'},{e:'🍒',n:'cherries',c:'Food'},{e:'🍑',n:'peach',c:'Food'},{e:'🥭',n:'mango',c:'Food'},{e:'🍍',n:'pineapple',c:'Food'},{e:'🥥',n:'coconut',c:'Food'},{e:'🥑',n:'avocado',c:'Food'},{e:'🍆',n:'eggplant',c:'Food'},{e:'🥦',n:'broccoli',c:'Food'},{e:'🌽',n:'corn',c:'Food'},{e:'🍕',n:'pizza',c:'Food'},{e:'🍔',n:'hamburger',c:'Food'},{e:'🍟',n:'fries',c:'Food'},{e:'🌮',n:'taco',c:'Food'},{e:'🌯',n:'burrito',c:'Food'},{e:'🍜',n:'noodles',c:'Food'},{e:'🍣',n:'sushi',c:'Food'},{e:'🍦',n:'ice cream',c:'Food'},{e:'🍩',n:'donut',c:'Food'},{e:'🍪',n:'cookie',c:'Food'},{e:'🎂',n:'birthday cake',c:'Food'},{e:'☕',n:'coffee',c:'Food'},{e:'🍵',n:'tea',c:'Food'},{e:'🧃',n:'juice box',c:'Food'},{e:'🍺',n:'beer',c:'Food'},{e:'🥂',n:'champagne',c:'Food'},
  // Travel
  {e:'🚗',n:'car',c:'Travel'},{e:'🚕',n:'taxi',c:'Travel'},{e:'🚙',n:'suv',c:'Travel'},{e:'🚌',n:'bus',c:'Travel'},{e:'🚎',n:'trolleybus',c:'Travel'},{e:'🏎',n:'racing car',c:'Travel'},{e:'🚓',n:'police car',c:'Travel'},{e:'🚑',n:'ambulance',c:'Travel'},{e:'🚒',n:'fire engine',c:'Travel'},{e:'✈️',n:'airplane',c:'Travel'},{e:'🚀',n:'rocket',c:'Travel'},{e:'🛸',n:'flying saucer',c:'Travel'},{e:'🚂',n:'locomotive',c:'Travel'},{e:'⛵',n:'sailboat',c:'Travel'},{e:'🚢',n:'ship',c:'Travel'},{e:'🏖',n:'beach',c:'Travel'},{e:'🏔',n:'mountain',c:'Travel'},{e:'🗺',n:'world map',c:'Travel'},{e:'🗼',n:'tokyo tower',c:'Travel'},{e:'🗽',n:'statue of liberty',c:'Travel'},
  // Objects
  {e:'💻',n:'laptop',c:'Objects'},{e:'🖥',n:'desktop computer',c:'Objects'},{e:'📱',n:'mobile phone',c:'Objects'},{e:'⌨️',n:'keyboard',c:'Objects'},{e:'🖨',n:'printer',c:'Objects'},{e:'📷',n:'camera',c:'Objects'},{e:'📺',n:'television',c:'Objects'},{e:'📻',n:'radio',c:'Objects'},{e:'🎮',n:'video game',c:'Objects'},{e:'🕹',n:'joystick',c:'Objects'},{e:'💡',n:'light bulb',c:'Objects'},{e:'🔦',n:'flashlight',c:'Objects'},{e:'📚',n:'books',c:'Objects'},{e:'📖',n:'open book',c:'Objects'},{e:'✏️',n:'pencil',c:'Objects'},{e:'🖊',n:'pen',c:'Objects'},{e:'📝',n:'memo',c:'Objects'},{e:'🔑',n:'key',c:'Objects'},{e:'🔒',n:'locked',c:'Objects'},{e:'🔓',n:'unlocked',c:'Objects'},
  // Symbols
  {e:'❤️',n:'red heart',c:'Symbols'},{e:'🧡',n:'orange heart',c:'Symbols'},{e:'💛',n:'yellow heart',c:'Symbols'},{e:'💚',n:'green heart',c:'Symbols'},{e:'💙',n:'blue heart',c:'Symbols'},{e:'💜',n:'purple heart',c:'Symbols'},{e:'🖤',n:'black heart',c:'Symbols'},{e:'💔',n:'broken heart',c:'Symbols'},{e:'💯',n:'hundred points',c:'Symbols'},{e:'✅',n:'check mark',c:'Symbols'},{e:'❌',n:'cross mark',c:'Symbols'},{e:'⭐',n:'star',c:'Symbols'},{e:'🌟',n:'glowing star',c:'Symbols'},{e:'💫',n:'dizzy',c:'Symbols'},{e:'🔥',n:'fire',c:'Symbols'},{e:'💥',n:'collision',c:'Symbols'},{e:'🎉',n:'party popper',c:'Symbols'},{e:'🎊',n:'confetti ball',c:'Symbols'},{e:'🏆',n:'trophy',c:'Symbols'},{e:'🥇',n:'gold medal',c:'Symbols'},
  // Flags
  {e:'🏳️',n:'white flag',c:'Flags'},{e:'🏴',n:'black flag',c:'Flags'},{e:'🏁',n:'chequered flag',c:'Flags'},{e:'🚩',n:'triangular flag',c:'Flags'},{e:'🏳️‍🌈',n:'rainbow flag',c:'Flags'},{e:'🇺🇸',n:'united states',c:'Flags'},{e:'🇬🇧',n:'united kingdom',c:'Flags'},{e:'🇨🇦',n:'canada',c:'Flags'},{e:'🇦🇺',n:'australia',c:'Flags'},{e:'🇩🇪',n:'germany',c:'Flags'},{e:'🇫🇷',n:'france',c:'Flags'},{e:'🇯🇵',n:'japan',c:'Flags'},{e:'🇨🇳',n:'china',c:'Flags'},{e:'🇮🇳',n:'india',c:'Flags'},{e:'🇧🇷',n:'brazil',c:'Flags'},
];

const CATEGORIES = ['All', 'Smileys', 'People', 'Animals', 'Food', 'Travel', 'Objects', 'Symbols', 'Flags'];
const RECENT_KEY = 'emoji_recent';

export default function EmojiPicker() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [toast, setToast] = useState('');
  const [recent, setRecent] = useState(() => {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
  });

  const filtered = EMOJIS.filter(em => {
    const matchCat = category === 'All' || em.c === category;
    const matchSearch = !search || em.n.includes(search.toLowerCase()) || em.e.includes(search);
    return matchCat && matchSearch;
  });

  const copyEmoji = (em) => {
    navigator.clipboard.writeText(em.e);
    setToast(`Copied ${em.e}`);
    setTimeout(() => setToast(''), 1500);
    const updated = [em, ...recent.filter(r => r.e !== em.e)].slice(0, 20);
    setRecent(updated);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
      {toast && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="fixed top-4 right-4 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm z-50 shadow-lg">
          {toast}
        </motion.div>
      )}

      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search emojis..."
          className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 text-sm"
        />

        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${category === c ? 'text-white' : ' text-surface-400'}`}>
              {c}
            </button>
          ))}
        </div>

        {recent.length > 0 && !search && (
          <div>
            <p className="text-xs text-surface-400 mb-2">Recently used</p>
            <div className="flex flex-wrap gap-1">
              {recent.map((em) => (
                <button key={em.e} onClick={() => copyEmoji(em)}
                  className="text-2xl p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title={em.n}>
                  {em.e}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-1 max-h-72 overflow-y-auto">
          {filtered.map((em) => (
            <button key={em.e + em.n} onClick={() => copyEmoji(em)}
              className="text-2xl p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={em.n}>
              {em.e}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full text-sm text-surface-500 text-center py-4">No emojis found</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
