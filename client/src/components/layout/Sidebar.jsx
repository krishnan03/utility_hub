import { NavLink } from 'react-router-dom';

const categories = [
  { id: 'image',       name: 'Images',       icon: '🎯', path: '/category/image' },
  { id: 'document',    name: 'Documents',    icon: '📋', path: '/category/document' },
  { id: 'spreadsheet', name: 'Spreadsheets', icon: '📊', path: '/category/spreadsheet' },
  { id: 'text',        name: 'Text & Writing',icon: '✍️', path: '/category/text' },
  { id: 'developer',   name: 'Dev Tools',    icon: '⚡', path: '/category/developer' },
  { id: 'media',       name: 'Audio & Video',icon: '🎧', path: '/category/media' },
  { id: 'finance',     name: 'Finance',      icon: '💹', path: '/category/finance' },
  { id: 'ai',          name: 'AI Tools',     icon: '🧠', path: '/category/ai' },
  { id: 'student',     name: 'Academic',     icon: '📐', path: '/category/student' },
  { id: 'design',      name: 'Creative',     icon: '🎨', path: '/category/design' },
  { id: 'security',    name: 'Privacy',      icon: '🛡️', path: '/category/security' },
  { id: 'seo',         name: 'SEO & Web',    icon: '🌐', path: '/category/seo' },
  { id: 'utility',     name: 'Converters',   icon: '⚙️', path: '/category/utility' },
];

export default function Sidebar() {
  return (
    <aside
      aria-label="Tool categories"
      className="hidden lg:flex flex-col w-60 shrink-0 overflow-y-auto bg-surface-900"
      style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}
    >
      <nav className="flex flex-col gap-1 p-4 pt-6" role="navigation" aria-label="Category navigation">
        <p className="section-label mb-3 px-3">Categories</p>
        {categories.map((cat) => (
          <NavLink
            key={cat.id}
            to={cat.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'text-primary-400 bg-primary-500/10 border-l-2 border-primary-500'
                  : 'text-surface-400 hover:text-surface-100 hover:bg-white/5'
              }`
            }
          >
            <span className="text-base" aria-hidden="true">{cat.icon}</span>
            <span>{cat.name}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export { categories };
