import { Link } from 'react-router-dom';
import { PenLine } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-16 border-t bg-card/50">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
          <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-primary">
            <PenLine className="h-4 w-4" />
            歪歪的日常
          </Link>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} 歪歪的日常 · 记录生活的小确幸
          </p>
        </div>
      </div>
    </footer>
  );
}
