import { Link, useLocation } from 'react-router-dom';
import { PenLine } from 'lucide-react';

const navItems = [
  { path: '/', label: '首页' },
  { path: '/posts', label: '文章' },
  { path: '/about', label: '关于' },
  { path: '/admin', label: '后台' },
];

export function Header() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-primary">
          <PenLine className="h-6 w-6" />
          <span>歪歪的日常</span>
        </Link>
        <nav className="flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`text-sm transition-colors hover:text-primary ${
                location.pathname === item.path
                  ? 'font-medium text-primary'
                  : 'text-muted-foreground'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
