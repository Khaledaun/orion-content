
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar,
  Clock,
  Play,
  Pause,
  Square,
  Plus,
  Edit,
  Trash2,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  RotateCcw,
  Zap,
  Settings
} from 'lucide-react';
import { Workflow, WorkflowStep } from '@/lib/ai/types';
import { toast } from 'sonner';

const workflowSchema = z.object({
  name: z.string().min(1, 'Workflow name is required'),
  description: z.string().min(1, 'Description is required'),
  trigger: z.enum(['manual', 'schedule', 'event']),
  scheduleTime: z.string().optional(),
  scheduleFrequency: z.enum(['once', 'daily', 'weekly', 'monthly']).optional(),
});

type WorkflowFormData = z.infer<typeof workflowSchema>;

interface WorkflowSchedulerProps {
  className?: string;
}

export function WorkflowScheduler({ className }: WorkflowSchedulerProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WorkflowFormData>({
    resolver: zodResolver(workflowSchema),
    defaultValues: {
      trigger: 'manual',
      scheduleFrequency: 'once',
    },
  });

  const triggerType = watch('trigger');

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/workflows');
      if (response.ok) {
        const data = await response.json();
        setWorkflows(data.workflows || []);
      }
    } catch (error) {
      console.error('Failed to load workflows:', error);
      // Load mock data for demonstration
      setWorkflows(mockWorkflows);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: WorkflowFormData) => {
    try {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create workflow');
      }

      toast.success('Workflow created successfully');
      reset();
      setIsCreating(false);
      loadWorkflows();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create workflow');
    }
  };

  const executeWorkflow = async (workflowId: string) => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}/execute`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to execute workflow');
      }

      toast.success('Workflow execution started');
      loadWorkflows();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to execute workflow');
    }
  };

  const pauseWorkflow = async (workflowId: string) => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}/pause`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to pause workflow');
      }

      toast.success('Workflow paused');
      loadWorkflows();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to pause workflow');
    }
  };

  const deleteWorkflow = async (workflowId: string) => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete workflow');
      }

      toast.success('Workflow deleted');
      loadWorkflows();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete workflow');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'in_progress':
        return <RotateCcw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Mock data for demonstration
  const mockWorkflows: Workflow[] = [
    {
      id: '1',
      name: 'Daily Content Generation',
      description: 'Automatically generate and schedule daily blog posts',
      status: 'active',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-20'),
      createdBy: 'user1',
      steps: [
        {
          id: 'step1',
          name: 'Generate Content',
          type: 'content_generation',
          status: 'completed',
          completedAt: new Date(),
        },
        {
          id: 'step2',
          name: 'Review Content',
          type: 'review',
          status: 'in_progress',
          assignedTo: 'reviewer1',
        },
        {
          id: 'step3',
          name: 'Approve for Publishing',
          type: 'approval',
          status: 'pending',
          assignedTo: 'editor1',
        },
        {
          id: 'step4',
          name: 'Publish Content',
          type: 'publish',
          status: 'pending',
        },
      ],
    },
    {
      id: '2',
      name: 'Weekly SEO Analysis',
      description: 'Analyze content performance and generate SEO recommendations',
      status: 'active',
      createdAt: new Date('2024-01-10'),
      updatedAt: new Date('2024-01-18'),
      createdBy: 'user2',
      steps: [
        {
          id: 'step1',
          name: 'Collect Analytics Data',
          type: 'analyze',
          status: 'completed',
          completedAt: new Date(),
        },
        {
          id: 'step2',
          name: 'Generate SEO Report',
          type: 'content_generation',
          status: 'completed',
          completedAt: new Date(),
        },
        {
          id: 'step3',
          name: 'Send Report to Team',
          type: 'publish',
          status: 'completed',
          completedAt: new Date(),
        },
      ],
    },
    {
      id: '3',
      name: 'Social Media Campaign',
      description: 'Create and schedule social media posts across platforms',
      status: 'paused',
      createdAt: new Date('2024-01-08'),
      updatedAt: new Date('2024-01-15'),
      createdBy: 'user3',
      steps: [
        {
          id: 'step1',
          name: 'Generate Social Content',
          type: 'content_generation',
          status: 'failed',
        },
        {
          id: 'step2',
          name: 'Schedule Posts',
          type: 'publish',
          status: 'pending',
        },
      ],
    },
  ];

  const displayWorkflows = workflows.length > 0 ? workflows : mockWorkflows;

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Workflow Automation</h2>
          <p className="text-muted-foreground">
            Create and manage automated content workflows
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Workflow
        </Button>
      </div>

      <Tabs defaultValue="workflows" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="workflows">Active Workflows</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="history">Execution History</TabsTrigger>
        </TabsList>

        <TabsContent value="workflows" className="space-y-4">
          {isCreating && (
            <Card>
              <CardHeader>
                <CardTitle>Create New Workflow</CardTitle>
                <CardDescription>
                  Set up an automated workflow for your content operations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Workflow Name</Label>
                      <Input
                        id="name"
                        placeholder="e.g., Daily Blog Generation"
                        {...register('name')}
                      />
                      {errors.name && (
                        <p className="text-sm text-red-500">{errors.name.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="trigger">Trigger Type</Label>
                      <Select onValueChange={(value) => setValue('trigger', value as any)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select trigger" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Manual</SelectItem>
                          <SelectItem value="schedule">Scheduled</SelectItem>
                          <SelectItem value="event">Event-based</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.trigger && (
                        <p className="text-sm text-red-500">{errors.trigger.message}</p>
                      )}
                    </div>
                  </div>

                  {triggerType === 'schedule' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="scheduleTime">Schedule Time</Label>
                        <Input
                          id="scheduleTime"
                          type="time"
                          {...register('scheduleTime')}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="scheduleFrequency">Frequency</Label>
                        <Select onValueChange={(value) => setValue('scheduleFrequency', value as any)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="once">Once</SelectItem>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe what this workflow does..."
                      rows={3}
                      {...register('description')}
                    />
                    {errors.description && (
                      <p className="text-sm text-red-500">{errors.description.message}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Creating...' : 'Create Workflow'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreating(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4">
            {displayWorkflows.map((workflow) => (
              <Card key={workflow.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{workflow.name}</h3>
                        <Badge className={getStatusColor(workflow.status)}>
                          {workflow.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        {workflow.description}
                      </p>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Progress</span>
                          <span>
                            {workflow.steps.filter(s => s.status === 'completed').length} / {workflow.steps.length} steps
                          </span>
                        </div>
                        <Progress 
                          value={(workflow.steps.filter(s => s.status === 'completed').length / workflow.steps.length) * 100} 
                        />
                      </div>

                      <div className="flex flex-wrap gap-2 mt-4">
                        {workflow.steps.map((step) => (
                          <div key={step.id} className="flex items-center gap-1 text-xs">
                            {getStatusIcon(step.status)}
                            <span>{step.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      {workflow.status === 'active' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => pauseWorkflow(workflow.id)}
                        >
                          <Pause className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => executeWorkflow(workflow.id)}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedWorkflow(workflow)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteWorkflow(workflow.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-blue-500" />
                  <h3 className="font-semibold">Content Generation</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Automated content creation with AI review and publishing
                </p>
                <div className="flex items-center justify-between">
                  <Badge variant="outline">4 steps</Badge>
                  <Button size="sm">Use Template</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-green-500" />
                  <h3 className="font-semibold">Social Media Campaign</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Create and schedule posts across multiple platforms
                </p>
                <div className="flex items-center justify-between">
                  <Badge variant="outline">3 steps</Badge>
                  <Button size="sm">Use Template</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Settings className="w-5 h-5 text-purple-500" />
                  <h3 className="font-semibold">SEO Optimization</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Analyze and optimize content for search engines
                </p>
                <div className="flex items-center justify-between">
                  <Badge variant="outline">5 steps</Badge>
                  <Button size="sm">Use Template</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Workflow execution history shows the last 30 days of activity.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            {[
              { workflow: 'Daily Content Generation', status: 'completed', time: '2 hours ago' },
              { workflow: 'Weekly SEO Analysis', status: 'completed', time: '1 day ago' },
              { workflow: 'Social Media Campaign', status: 'failed', time: '2 days ago' },
              { workflow: 'Daily Content Generation', status: 'completed', time: '1 day ago' },
              { workflow: 'Content Review Process', status: 'completed', time: '3 days ago' },
            ].map((execution, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(execution.status)}
                  <div>
                    <p className="font-medium">{execution.workflow}</p>
                    <p className="text-sm text-muted-foreground">{execution.time}</p>
                  </div>
                </div>
                <Badge className={getStatusColor(execution.status)}>
                  {execution.status}
                </Badge>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
