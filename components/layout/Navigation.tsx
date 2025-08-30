
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { 
  FileText, 
  CheckSquare, 
  Settings, 
  BarChart3, 
  Globe, 
  Shield,
  AlertTriangle,
  BookOpen,
  User,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationProps {
  userRole?: 'ADMIN' | 'EDITOR' | 'VIEWER';
  pendingReviews?: number;
}

export function Navigation({ userRole = 'VIEWER', pendingReviews = 0 }: NavigationProps) {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

  const menuItems = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: BarChart3,
      description: 'Overview and analytics',
      roles: ['ADMIN', 'EDITOR', 'VIEWER'],
    },
    {
      title: 'Sites',
      href: '/sites',
      icon: Globe,
      description: 'Manage content sites',
      roles: ['ADMIN', 'EDITOR', 'VIEWER'],
    },
    {
      title: 'Review',
      href: '/review',
      icon: CheckSquare,
      description: 'Content review queue',
      roles: ['ADMIN', 'EDITOR', 'VIEWER'],
      badge: pendingReviews > 0 ? pendingReviews : undefined,
    },
    {
      title: 'Operations',
      href: '/ops',
      icon: Shield,
      description: 'System monitoring and controls',
      roles: ['ADMIN'],
    },
    {
      title: 'Documentation',
      href: '/docs',
      icon: BookOpen,
      description: 'API docs and guides',
      roles: ['ADMIN', 'EDITOR', 'VIEWER'],
    },
  ];

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(userRole)
  );

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and main navigation */}
          <div className="flex items-center space-x-8">
            {/* Orion Logo */}
            <Link href="/dashboard" className="flex items-center">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-orion-navy rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">O</span>
                </div>
                <span className="text-xl font-bold text-orion-navy">Orion</span>
              </div>
            </Link>

            {/* Main Navigation */}
            <NavigationMenu>
              <NavigationMenuList>
                {filteredMenuItems.map((item) => (
                  <NavigationMenuItem key={item.href}>
                    <Link href={item.href} legacyBehavior passHref>
                      <NavigationMenuLink
                        className={cn(
                          "group inline-flex h-10 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-orion-background-light focus:bg-orion-background-light focus:outline-none disabled:pointer-events-none disabled:opacity-50",
                          isActive(item.href)
                            ? "bg-orion-navy text-white hover:bg-orion-navy-light"
                            : "text-orion-navy-light hover:text-orion-navy"
                        )}
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {item.title}
                        {item.badge && (
                          <Badge 
                            className="ml-2 bg-orion-crimson text-white text-xs px-1.5 py-0.5 min-w-[20px] h-5"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </NavigationMenuLink>
                    </Link>
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* Right side - User menu */}
          <div className="flex items-center space-x-4">
            {/* Role badge */}
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs",
                userRole === 'ADMIN' && "border-orion-blue text-orion-blue",
                userRole === 'EDITOR' && "border-orion-emerald text-orion-emerald",
                userRole === 'VIEWER' && "border-gray-400 text-gray-600"
              )}
            >
              {userRole}
            </Badge>

            {/* System alerts (for admins) */}
            {userRole === 'ADMIN' && (
              <Button 
                variant="ghost" 
                size="sm"
                className="text-orion-amber hover:text-orion-amber-dark hover:bg-orion-background-light"
              >
                <AlertTriangle className="h-4 w-4" />
              </Button>
            )}

            {/* User menu */}
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="h-9 w-9 rounded-full bg-orion-navy text-white hover:bg-orion-navy-light">
                    <User className="h-4 w-4" />
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="w-48 p-2">
                      <Link href="/profile" legacyBehavior passHref>
                        <NavigationMenuLink className="block px-3 py-2 text-sm text-orion-navy hover:bg-orion-background-light rounded">
                          <User className="inline mr-2 h-4 w-4" />
                          Profile
                        </NavigationMenuLink>
                      </Link>
                      {userRole === 'ADMIN' && (
                        <Link href="/settings" legacyBehavior passHref>
                          <NavigationMenuLink className="block px-3 py-2 text-sm text-orion-navy hover:bg-orion-background-light rounded">
                            <Settings className="inline mr-2 h-4 w-4" />
                            Settings
                          </NavigationMenuLink>
                        </Link>
                      )}
                      <hr className="my-2 border-gray-200" />
                      <button className="w-full text-left px-3 py-2 text-sm text-orion-crimson hover:bg-orion-background-light rounded">
                        <LogOut className="inline mr-2 h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}
