import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { cn } from '@artificer/ui';

interface NavLink {
  href: string;
  label: string;
  icon?: string;
}

const navLinks: NavLink[] = [
  { href: '/', label: 'Chat', icon: '💬' },
  { href: '/translate', label: 'Translate', icon: '🌍' },
  { href: '/worldbuilding', label: 'Worldbuilding', icon: '🏰' },
  { href: '/batch', label: 'Batch Jobs', icon: '⚙️' },
  { href: '/projects', label: 'Projects', icon: '📁' },
  { href: '/monitoring', label: 'Monitoring', icon: '📊' },
];

const demoLinks: NavLink[] = [
  { href: '/translator-demo', label: 'Translator Components' },
  { href: '/worldbuilder-demo', label: 'Worldbuilder Components' },
];

export function Navigation() {
  const router = useRouter();

  const isActive = (href: string) => {
    if (href === '/') {
      return router.pathname === '/';
    }
    return router.pathname.startsWith(href);
  };

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo / Brand */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-2xl">🤖</span>
              <span className="text-xl font-bold text-gray-900">
                Artificer Workbench
              </span>
            </Link>
          </div>

          {/* Main Navigation */}
          <div className="flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive(link.href)
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                {link.icon && <span className="mr-1">{link.icon}</span>}
                {link.label}
              </Link>
            ))}

            {/* Demo Dropdown */}
            <div className="relative group">
              <button
                className={cn(
                  'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                Demos ▾
              </button>
              <div className="absolute right-0 mt-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                <div className="py-1">
                  {demoLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
