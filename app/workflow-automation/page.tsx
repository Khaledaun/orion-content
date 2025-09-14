
'use client';

import { WorkflowScheduler } from '@/components/workflow/WorkflowScheduler';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Zap, Calendar, Settings } from 'lucide-react';

export default function WorkflowAutomationPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Workflow Automation</h1>
        <p className="text-muted-foreground">
          Create and manage automated workflows for content creation, review, and publishing.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              <h3 className="font-semibold">Automated Workflows</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Set up automated content generation, review, and publishing workflows.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold">Smart Scheduling</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Schedule workflows to run at optimal times based on your audience and goals.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Settings className="w-5 h-5 text-green-500" />
              <h3 className="font-semibold">Custom Templates</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Use pre-built templates or create custom workflows for your specific needs.
            </p>
          </CardContent>
        </Card>
      </div>

      <Alert>
        <Zap className="h-4 w-4" />
        <AlertDescription>
          <strong>Automation Power:</strong> Workflows can include content generation, SEO optimization, 
          social media posting, email campaigns, and performance analysis - all running automatically.
        </AlertDescription>
      </Alert>

      <WorkflowScheduler />
    </div>
  );
}
