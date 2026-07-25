'use client';
import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createAvatar } from '@dicebear/core';
import { adventurer } from '@dicebear/collection';
import Image from 'next/image';
import { Bell } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAuth } from '../../context/AuthContext';
import { LoginForm } from './LoginModal';
import { MobileMenu } from './MobileMenu';

const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Games', href: '/games' },
  { label: 'Categories', href: '/categories' },
  { label: 'Community', href: '/community' },
];

export default function Header() {
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuth();
  const isActive = (href: string) => pathname === href;
  const avatar = useMemo(() => {
    return createAvatar(adventurer, {
      size: 128,
      seed: user?.username || 'user',
    }).toDataUri();
  }, [user]);

  return (
    <div>
      <nav
        aria-label="Main navigation"
        className="flex items-center rounded-[40px] fixed z-20 top-5 left-1/2 transform -translate-x-1/2 w-full justify-between lg:justify-center max-w-[90%] lg:max-w-[1088px] mx-auto gap-4 lg:gap-15 p-5 md:px-4.5 md:py-4 bg-dark-100/30 md:rounded-2xl backdrop-blur-[5px]"
      >
        <div className="flex items-center gap-1 md:gap-2">
          <div className="relative w-14 md:w-23 h-4 md:h-6">
            <Image alt="DeWordle Studio" src="/logo.svg" width={91} height={24} />
          </div>
          <div className="font-clash font-normal text-white text-base md:text-2xl tracking-widest">
            Studio
          </div>
        </div>

        <MobileMenu isAuthenticated={isAuthenticated} />

        <ul
          role="list"
          className="hidden lg:flex items-center justify-center p-2.5 w-[35rem]"
        >
          {navItems.map((item, index) => (
            <li key={item.label} className="flex items-center">
              <Link
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={`font-jakarta font-semibold text-lg tracking-wide whitespace-nowrap ${
                  isActive(item.href) ? 'text-white' : 'text-gray-400'
                }`}
              >
                {item.label}
              </Link>
              {index < navItems.length - 1 && (
                <div aria-hidden="true" className="h-6 w-0.5 mx-8 bg-[#4b5fff]" />
              )}
            </li>
          ))}
        </ul>

        {!isAuthenticated && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Open login or sign up modal"
                className="hidden md:flex px-6 py-4 rounded-lg border-[0.5px] border-white bg-transparent hover:bg-white/10 text-white font-jakarta text-lg tracking-wide font-medium leading-6 focus:outline-none focus:ring-2 focus:ring-white/60 touch-target"
              >
                Login / Sign up
              </button>
            </PopoverTrigger>
            <PopoverContent>
              <LoginForm closeModal={() => undefined} />
            </PopoverContent>
          </Popover>
        )}
        {isAuthenticated && (
          <div className="hidden md:flex gap-4 items-center">
            <div className="border p-1 rounded-full">
              <Image
                src={avatar}
                alt={`${user?.username ?? 'User'} avatar`}
                width={30}
                height={30}
                className="rounded-full"
              />
            </div>
            <button
              type="button"
              aria-label="View notifications"
              className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/60 rounded-full p-1 touch-target"
            >
              <Bell aria-hidden="true" />
            </button>
          </div>
        )}
      </nav>
    </div>
  );
}
