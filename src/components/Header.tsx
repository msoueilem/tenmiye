'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface HeaderProps {
  title?: string;
  logoUrl?: string;
}

const NAV_ITEMS: { label: string; href: string; isRouterLink?: boolean }[] = [
  { label: 'الرئيسية', href: '#' },
  { label: 'عن المجموعة', href: '#about-us' },
  { label: 'المبادرات', href: '#initiatives' },
  { label: 'الهيكل التنظيمي', href: '#hierarchy' },
  { label: 'انضم إلينا', href: '#join-us' },
  { label: 'المدونة', href: '/blog', isRouterLink: true },
];

export function Header({ title, logoUrl }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  // Close menu on resize to desktop
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 768) setMenuOpen(false);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const linkClass =
    'text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-primary transition-colors duration-150';

  const mobileLinkClass =
    'flex items-center rounded-xl px-4 py-3.5 text-base font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-primary dark:hover:text-primary transition-colors duration-150';

  return (
    <header
      dir="rtl"
      className="sticky top-0 z-50 bg-background-light/95 dark:bg-background-dark/95 border-b border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-sm"
      ref={menuRef}
    >
      {/* ── Main bar ── */}
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-10">

        {/* Brand */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-deep-green flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg">
            <img
              src={logoUrl || '/assets/images/logo.png'}
              alt={title || 'مجموعة الإرادة'}
              className="h-full w-full object-cover"
            />
          </div>
          <span className="hidden sm:block truncate text-base font-bold leading-tight text-slate-900 dark:text-slate-100">
            {title || 'مجموعة الإرادة لتنمية الغدية'}
          </span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-7 lg:gap-9">
          {NAV_ITEMS.map((item) =>
            item.isRouterLink ? (
              <Link key={item.href} href={item.href} className={linkClass}>
                {item.label}
              </Link>
            ) : (
              <a key={item.href} href={item.href} className={linkClass}>
                {item.label}
              </a>
            ),
          )}
        </nav>

        {/* Mobile burger */}
        <button
          type="button"
          aria-label={menuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          onClick={() => setMenuOpen((v) => !v)}
          className="md:hidden flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {menuOpen ? (
            /* X icon */
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            /* Hamburger icon */
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* ── Mobile dropdown menu ── */}
      <div
        id="mobile-nav"
        className={`md:hidden absolute inset-x-0 top-full z-40 overflow-hidden border-b border-slate-200 dark:border-slate-800 bg-background-light dark:bg-background-dark shadow-lg transition-all duration-200 ease-in-out ${
          menuOpen ? 'max-h-[24rem] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
        }`}
      >
        <nav className="flex flex-col gap-1 px-3 py-3">
          {NAV_ITEMS.map((item) =>
            item.isRouterLink ? (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={mobileLinkClass}
              >
                {item.label}
              </Link>
            ) : (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={mobileLinkClass}
              >
                {item.label}
              </a>
            ),
          )}
        </nav>
      </div>
    </header>
  );
}
