// components/SetupGate.tsx - Setup and empty state handler

import Link from 'next/link';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Settings, User, Database } from 'lucide-react';

interface SetupGateProps {
  hasAuth?: boolean;
  hasSites?: boolean;
  demoMode?: boolean;
}

export default function SetupGate({ hasAuth = false, hasSites = false, demoMode = false }: SetupGateProps) {
  // If user is authenticated and has sites, don't show setup gate
  if (hasAuth && hasSites) {
    return null;
  }

  // If in demo mode, show demo content
  if (demoMode) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="mr-2 h-6 w-6" />
              Demo Mode
            </CardTitle>
            <CardDescription>
              Orion CMS is running in demonstration mode
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              This is a demonstration of the Orion Content Management System. 
              Database connectivity is limited in this environment.
            </p>
            <div className="grid gap-2">
              <Link href="/login">
                <Button className="w-full" variant="outline">
                  <User className="mr-2 h-4 w-4" />
                  View Login Demo
                </Button>
              </Link>
              <Link href="/setup">
                <Button className="w-full" variant="outline">
                  <Settings className="mr-2 h-4 w-4" />
                  View Setup Demo
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If no authentication, show login prompt
  if (!hasAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-6 w-6" />
              Authentication Required
            </CardTitle>
            <CardDescription>
              Please sign in to access Orion CMS
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              You need to be authenticated to access the content management system.
            </p>
            <Link href="/login">
              <Button className="w-full">
                Sign In
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If authenticated but no sites, show setup prompt
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="mr-2 h-6 w-6" />
            Setup Required
          </CardTitle>
          <CardDescription>
            Welcome to Orion CMS! Let&apos;s get you started.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Your account is set up, but you haven&apos;t created any content sites yet. 
            Start by setting up your first site or completing the initial configuration.
          </p>
          <div className="grid gap-2">
            <Link href="/setup">
              <Button className="w-full">
                <Settings className="mr-2 h-4 w-4" />
                Complete Setup
              </Button>
            </Link>
            <Link href="/sites">
              <Button className="w-full" variant="outline">
                Create First Site
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}