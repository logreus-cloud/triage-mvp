'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/', label: 'Главная' },
  { href: '/survey', label: 'Опрос' },
  { href: '/doctor', label: 'Врач' },
  { href: '/about', label: 'Как устроено' },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="nav">
      <div className="wrap nav-in">
        <Link href="/" className="brand">
          <span className="dot" aria-hidden="true" />
          <span>Триаж<span className="brand-tail"> · предварительный опрос</span></span>
        </Link>
        {ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="link"
            data-active={pathname === item.href}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
