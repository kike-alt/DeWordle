'use client';
import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { createAvatar } from '@dicebear/core';
import { adventurer } from '@dicebear/collection';
import Image from 'next/image';
import { Bell } from 'lucide-react';
import { MenuIcon } from './ui/icons/icon';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAuth } from '../../context/AuthContext';
import { AuthModal } from './auth/AuthModal';

const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Games', href: '/games' },
  { label: 'Categories', href: '/categories' },
  { label: 'Community', href: '/community' },
];

export default function Header() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated, user } = useAuth();
  const [modal, setModal] = useState(false);
  const [lastAuthMode, setLastAuthMode] = useState<'login' | 'signup' | 'forgot-password'>('login');
  const [resetSuccess, setResetSuccess] = useState(false);
  const isActive = (href: string) => pathname === href;
  const avatar = useMemo(() => {
    return createAvatar(adventurer, {
      size: 128,
      seed: user?.username || 'user',
    }).toDataUri();
  }, [user]);

  // Check for password reset success
  useEffect(() => {
    const resetParam = searchParams.get('reset');
    if (resetParam === 'success' && !isAuthenticated) {
      setResetSuccess(true);
      setModal(true);
      setLastAuthMode('login');
      // Clear the URL parameter
      const url = new URL(window.location.href);
      url.searchParams.delete('reset');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams, isAuthenticated]);

  return (
    <div>
      <nav className="flex items-center rounded-[40px]  fixed z-20 top-5 left-1/2 transform -translate-x-1/2 w-full justify-between lg:justify-center max-w-[90%] lg:max-w-[1088px] mx-auto  gap-4 lg:gap-15 p-5 md:px-4.5 md:py-4 bg-dark-100/30 md:rounded-2xl backdrop-blur-[5px]">
        <div className="flex items-center gap-1 md:gap-2">
          <div className="relative w-14 md:w-23 h-4 md:h-6">
            <Image alt="lead studio" src="/logo.svg" width={91} height={24} />
          </div>
          <div className="font-clash font-normal text-white text-base md:text-2xl tracking-widest">
            Studio
          </div>
        </div>

        <MenuIcon className="block md:hidden" />
        <div className="hidden lg:flex items-center justify-center p-2.5 w-[35rem]">
          {navItems.map((item, index) => (
            <div key={item.label} className="flex items-center">
              <Link
                href={item.href}
                className={`font-jakarta font-semibold text-lg tracking-wide whitespace-nowrap ${isActive(item.href) ? 'text-white' : 'text-gray-400'
                  }`}
              >
                {item.label}
              </Link>
              {index < navItems.length - 1 && (
                <div className="h-6 w-0.5 mx-8 bg-[#4b5fff]" />
              )}
            </div>
          ))}
        </div>

        {!isAuthenticated && (
          <Popover open={modal} onOpenChange={setModal}>
            <PopoverTrigger >
              <div className="hidden md:flex">
                <div
                  className="px-6 py-4 rounded-lg border-[0.5px] border-white bg-transparent hover:bg-white/10 text-white font-jakarta text-lg tracking-wide font-medium leading-6"
                >
                  Login / Sign up
                </div>
              </div>
            </PopoverTrigger>
            <PopoverContent onInteractOutside={(e) => {
              e.preventDefault();
            }}>
              <AuthModal
                closeModal={() => {
                  setModal(false);
                  setResetSuccess(false);
                }}
                initialMode={lastAuthMode}
                onModeChange={setLastAuthMode}
                resetSuccess={resetSuccess}
              />
            </PopoverContent>
          </Popover>
        )}
        {isAuthenticated && (
          <div className="flex gap-4 items-center">
            <div className="border p-1 rounded-full">
              <Image
                src={avatar}
                alt="User Avatar"
                width={30}
                height={30}
                className="rounded-full"
              />
            </div>
            <button className=" cursor-pointer">
              <Bell />
            </button>
          </div>
        )}
      </nav>
    </div>
  );
}
