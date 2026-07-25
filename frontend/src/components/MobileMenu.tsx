'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MenuIcon } from './ui/icons/icon';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Games', href: '/games' },
  { label: 'Categories', href: '/categories' },
  { label: 'Community', href: '/community' },
];

interface MobileMenuProps {
  isAuthenticated: boolean;
}

export function MobileMenu({ isAuthenticated }: MobileMenuProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const isActive = (href: string) => pathname === href;

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={isOpen}
        aria-controls="mobile-menu"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 touch-target"
      >
        <MenuIcon aria-hidden="true" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <nav
            id="mobile-menu"
            role="navigation"
            aria-label="Mobile navigation"
            className="fixed top-0 right-0 h-full w-72 bg-primary-950 z-50 p-6 shadow-xl"
          >
            <div className="flex justify-between items-center mb-8">
              <span className="font-clash text-white text-xl">Menu</span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setIsOpen(false)}
                className="p-2 touch-target"
              >
                <span aria-hidden="true">✕</span>
              </button>
            </div>

            <ul className="space-y-4" role="list">
              {navItems.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                    onClick={() => setIsOpen(false)}
                    className={`block py-3 px-4 rounded-lg font-jakarta text-lg transition-colors touch-target ${
                      isActive(item.href)
                        ? 'text-white bg-white/10'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            {!isAuthenticated && (
              <div className="mt-8">
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="block w-full px-6 py-3 text-center rounded-lg border border-white bg-transparent hover:bg-white/10 text-white font-jakarta text-lg touch-target"
                >
                  Login / Sign up
                </Link>
              </div>
            )}
          </nav>
        </>
      )}
    </div>
  );
}
