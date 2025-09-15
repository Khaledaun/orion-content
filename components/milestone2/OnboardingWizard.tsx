"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Rocket,
  CheckCircle,
  Clock,
  Search,
  BarChart3,
  Zap,
  Play,
  Pause,
  RotateCcw,
  AlertCircle,
  TrendingUp,
  Users,
  Globe,
  Shield,
  Sparkles,
  Award,
  Target,
  BookOpen,
} from "lucide-react";

interface AuditStep {
  id: string;
  name: string;
  description: string;
  status: "pending" | "running" | "completed" | "error";
  duration: number; // in seconds
  result?: {
    score: number;
    issues: string[];
    recommendations: string[];
  };
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  optional: boolean;
  estimatedTime: string;
  icon: React.ReactNode;
}

interface OnboardingWizardProps {
  onComplete?: () => void;
  userTier?: "starter" | "pro" | "guru";
}

export function OnboardingWizard({
  onComplete,
  userTier = "pro",
}: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [auditType, setAuditType] = useState<"quick" | "deep">("quick");
  const [auditRunning, setAuditRunning] = useState(false);
  const [auditProgress, setAuditProgress] = useState(0);
  const [siteUrl, setSiteUrl] = useState("");
  const [ga4Connected, setGa4Connected] = useState(false);
  const [gscConnected, setGscConnected] = useState(false);

  const quickAuditSteps: AuditStep[] = [
    {
      id: "basic-seo",
      name: "Basic SEO Check",
      description: "Checking meta tags, titles, and basic structure",
      status: "pending",
      duration: 15,
    },
    {
      id: "performance",
      name: "Performance Scan",
      description: "Analyzing page speed and core web vitals",
      status: "pending",
      duration: 20,
    },
    {
      id: "mobile-friendly",
      name: "Mobile Optimization",
      description: "Testing mobile responsiveness and usability",
      status: "pending",
      duration: 10,
    },
    {
      id: "content-analysis",
      name: "Content Quality",
      description: "Evaluating content structure and readability",
      status: "pending",
      duration: 25,
    },
  ];

  const deepAuditSteps: AuditStep[] = [
    ...quickAuditSteps,
    {
      id: "technical-seo",
      name: "Technical SEO Deep Dive",
      description:
        "Comprehensive technical analysis including schema, crawlability",
      status: "pending",
      duration: 120,
    },
    {
      id: "competitor-analysis",
      name: "Competitor Research",
      description: "Analyzing top competitors and identifying opportunities",
      status: "pending",
      duration: 180,
    },
    {
      id: "keyword-research",
      name: "Keyword Opportunities",
      description: "Finding high-value keyword opportunities in your niche",
      status: "pending",
      duration: 150,
    },
    {
      id: "backlink-analysis",
      name: "Backlink Profile",
      description: "Analyzing current backlinks and finding new opportunities",
      status: "pending",
      duration: 200,
    },
  ];

  const [auditSteps, setAuditSteps] = useState<AuditStep[]>(quickAuditSteps);

  const onboardingSteps: OnboardingStep[] = [
    {
      id: "welcome",
      title: "Welcome to Orion CMS Pro! 🎉",
      description:
        "Let's get you set up with the most powerful content management system",
      completed: false,
      optional: false,
      estimatedTime: "2 min",
      icon: <Rocket className="h-5 w-5" />,
    },
    {
      id: "site-setup",
      title: "Connect Your Website",
      description:
        "Add your website URL so we can start optimizing your content",
      completed: false,
      optional: false,
      estimatedTime: "1 min",
      icon: <Globe className="h-5 w-5" />,
    },
    {
      id: "seo-audit",
      title: "SEO Health Check",
      description:
        "Run a comprehensive audit to identify optimization opportunities",
      completed: false,
      optional: false,
      estimatedTime: auditType === "quick" ? "2 min" : "15 min",
      icon: <Search className="h-5 w-5" />,
    },
    {
      id: "analytics-setup",
      title: "Connect Analytics",
      description:
        "Link Google Analytics 4 and Search Console for powerful insights",
      completed: false,
      optional: false,
      estimatedTime: "3 min",
      icon: <BarChart3 className="h-5 w-5" />,
    },
    {
      id: "content-strategy",
      title: "Define Content Strategy",
      description: "Set up your content niches and target audience",
      completed: false,
      optional: false,
      estimatedTime: "5 min",
      icon: <Target className="h-5 w-5" />,
    },
    {
      id: "tour",
      title: "Interactive Tour",
      description: "Take a guided tour of your new dashboard and features",
      completed: false,
      optional: true,
      estimatedTime: "10 min",
      icon: <BookOpen className="h-5 w-5" />,
    },
  ];

  const [steps, setSteps] = useState(onboardingSteps);

  const runAudit = async () => {
    if (!siteUrl) return;

    setAuditRunning(true);
    setAuditProgress(0);

    const stepsToRun = auditType === "quick" ? quickAuditSteps : deepAuditSteps;
    const totalDuration = stepsToRun.reduce(
      (sum, step) => sum + step.duration,
      0,
    );
    let elapsed = 0;

    for (let i = 0; i < stepsToRun.length; i++) {
      const step = stepsToRun[i];

      // Update step status to running
      setAuditSteps((prev) =>
        prev.map((s) =>
          s.id === step.id ? { ...s, status: "running" as const } : s,
        ),
      );

      // Simulate step execution
      const stepInterval = setInterval(() => {
        elapsed += 1;
        setAuditProgress((elapsed / totalDuration) * 100);
      }, 1000);

      await new Promise((resolve) => setTimeout(resolve, step.duration * 1000));
      clearInterval(stepInterval);

      // Complete step with mock results
      const mockResult = {
        score: Math.floor(Math.random() * 30) + 70, // 70-100
        issues: [
          "Missing meta description on 3 pages",
          "Image alt tags need optimization",
          "Page load time could be improved",
        ].slice(0, Math.floor(Math.random() * 3) + 1),
        recommendations: [
          "Add descriptive meta descriptions",
          "Optimize images for web",
          "Enable browser caching",
        ].slice(0, Math.floor(Math.random() * 3) + 1),
      };

      setAuditSteps((prev) =>
        prev.map((s) =>
          s.id === step.id
            ? { ...s, status: "completed" as const, result: mockResult }
            : s,
        ),
      );
    }

    setAuditRunning(false);
    setAuditProgress(100);

    // Mark SEO audit step as completed
    setSteps((prev) =>
      prev.map((s) => (s.id === "seo-audit" ? { ...s, completed: true } : s)),
    );
  };

  const completeStep = (stepId: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, completed: true } : s)),
    );

    if (stepId === "site-setup" && siteUrl) {
      // Auto-advance to audit step
      setCurrentStep(2);
    }
  };

  const connectGA4 = () => {
    setGa4Connected(true);
    // In real implementation, this would trigger OAuth flow
  };

  const connectGSC = () => {
    setGscConnected(true);
    // In real implementation, this would trigger OAuth flow
  };

  const completedSteps = steps.filter((s) => s.completed).length;
  const totalSteps = steps.length;
  const progressPercentage = (completedSteps / totalSteps) * 100;

  const currentStepData = steps[currentStep];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Welcome to Orion CMS Pro! 🚀
        </h1>
        <p className="text-lg text-gray-600 mb-4">
          Let's get you set up in just a few minutes. Your content empire
          awaits!
        </p>
        <div className="flex items-center justify-center gap-2 mb-6">
          <Badge variant="secondary" className="bg-purple-100 text-purple-800">
            <Sparkles className="h-4 w-4 mr-1" />
            {userTier.charAt(0).toUpperCase() + userTier.slice(1)} Plan
          </Badge>
          <Badge variant="outline">
            <Clock className="h-4 w-4 mr-1" />
            ~15 minutes
          </Badge>
        </div>
      </div>

      {/* Progress Overview */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Setup Progress
            </h3>
            <span className="text-sm text-gray-600">
              {completedSteps}/{totalSteps} completed
            </span>
          </div>
          <Progress value={progressPercentage} className="h-3 mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`
                  flex items-center gap-2 p-2 rounded-lg text-xs transition-all
                  ${
                    step.completed
                      ? "bg-green-100 text-green-800"
                      : index === currentStep
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-600"
                  }
                `}
              >
                {step.completed ? (
                  <CheckCircle className="h-4 w-4" />
                ) : index === currentStep ? (
                  <Clock className="h-4 w-4" />
                ) : (
                  step.icon
                )}
                <span className="truncate">{step.title}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Step */}
      <Card className="min-h-[500px]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {currentStepData?.icon}
                {currentStepData?.title}
                <Badge variant="outline" className="ml-2">
                  Step {currentStep + 1} of {totalSteps}
                </Badge>
              </CardTitle>
              <CardDescription className="mt-2">
                {currentStepData?.description}
              </CardDescription>
            </div>
            <Badge variant="secondary">
              <Clock className="h-4 w-4 mr-1" />
              {currentStepData?.estimatedTime}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Step Content */}
          {currentStep === 0 && (
            <div className="text-center space-y-6">
              <div className="w-24 h-24 mx-auto bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <Rocket className="h-12 w-12 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Ready to Transform Your Content Strategy?
                </h3>
                <p className="text-gray-600 mb-6">
                  Orion CMS Pro will help you create, optimize, and scale your
                  content like never before. With AI-powered insights, automated
                  workflows, and beautiful analytics, you're about to experience
                  content management that actually works.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <Zap className="h-8 w-8 text-blue-600 mb-2" />
                    <h4 className="font-semibold text-gray-900">AI-Powered</h4>
                    <p className="text-sm text-gray-600">
                      Smart topic generation and optimization
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <TrendingUp className="h-8 w-8 text-green-600 mb-2" />
                    <h4 className="font-semibold text-gray-900">Analytics</h4>
                    <p className="text-sm text-gray-600">
                      Real-time performance insights
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <Award className="h-8 w-8 text-purple-600 mb-2" />
                    <h4 className="font-semibold text-gray-900">Automation</h4>
                    <p className="text-sm text-gray-600">
                      Streamlined publishing workflows
                    </p>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => {
                  completeStep("welcome");
                  setCurrentStep(1);
                }}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                size="lg"
              >
                Let's Get Started! 🎯
              </Button>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Globe className="h-16 w-16 mx-auto text-blue-600 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Connect Your Website
                </h3>
                <p className="text-gray-600">
                  Enter your website URL so we can start analyzing and
                  optimizing your content.
                </p>
              </div>

              <div className="max-w-md mx-auto space-y-4">
                <div>
                  <Label htmlFor="site-url" className="text-sm font-medium">
                    Website URL
                  </Label>
                  <Input
                    id="site-url"
                    type="url"
                    placeholder="https://your-website.com"
                    value={siteUrl}
                    onChange={(e) => setSiteUrl(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <Button
                  onClick={() => {
                    if (siteUrl) {
                      completeStep("site-setup");
                    }
                  }}
                  disabled={!siteUrl}
                  className="w-full"
                  size="lg"
                >
                  Connect Website
                </Button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Search className="h-16 w-16 mx-auto text-green-600 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  SEO Health Check
                </h3>
                <p className="text-gray-600">
                  Choose your audit type. Quick audits take 2 minutes, deep
                  audits provide comprehensive insights in 15 minutes.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Card
                  className={`cursor-pointer transition-all ${auditType === "quick" ? "ring-2 ring-blue-500 bg-blue-50" : "hover:shadow-md"}`}
                  onClick={() => setAuditType("quick")}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Zap className="h-6 w-6 text-blue-600" />
                      <h4 className="font-semibold">Quick Audit</h4>
                      <Badge variant="secondary">2 min</Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      Essential SEO checks including meta tags, performance, and
                      mobile optimization.
                    </p>
                  </CardContent>
                </Card>

                <Card
                  className={`cursor-pointer transition-all ${auditType === "deep" ? "ring-2 ring-purple-500 bg-purple-50" : "hover:shadow-md"}`}
                  onClick={() => setAuditType("deep")}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Target className="h-6 w-6 text-purple-600" />
                      <h4 className="font-semibold">Deep Audit</h4>
                      <Badge variant="secondary">15 min</Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      Comprehensive analysis including technical SEO,
                      competitors, and keyword opportunities.
                    </p>
                  </CardContent>
                </Card>
              </div>

              {auditRunning && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-6">
                    <div className="text-center mb-4">
                      <div className="w-16 h-16 mx-auto bg-blue-600 rounded-full flex items-center justify-center mb-4">
                        <RotateCcw className="h-8 w-8 text-white animate-spin" />
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        Running {auditType === "quick" ? "Quick" : "Deep"}{" "}
                        Audit...
                      </h4>
                      <Progress value={auditProgress} className="h-3 mb-2" />
                      <p className="text-sm text-gray-600">
                        {auditProgress.toFixed(0)}% complete - Analyzing your
                        website
                      </p>
                    </div>

                    <div className="space-y-2">
                      {auditSteps.map((step) => (
                        <div
                          key={step.id}
                          className="flex items-center gap-3 p-2 rounded"
                        >
                          {step.status === "completed" ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : step.status === "running" ? (
                            <RotateCcw className="h-5 w-5 text-blue-600 animate-spin" />
                          ) : (
                            <Clock className="h-5 w-5 text-gray-400" />
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-medium">{step.name}</p>
                            <p className="text-xs text-gray-600">
                              {step.description}
                            </p>
                          </div>
                          {step.result && (
                            <Badge
                              variant="secondary"
                              className="bg-green-100 text-green-800"
                            >
                              {step.result.score}%
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {!auditRunning && auditProgress === 0 && (
                <div className="text-center">
                  <Button
                    onClick={runAudit}
                    disabled={!siteUrl}
                    className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                    size="lg"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start {auditType === "quick" ? "Quick" : "Deep"} Audit
                  </Button>
                </div>
              )}

              {auditProgress === 100 && !auditRunning && (
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-6">
                    <div className="text-center mb-4">
                      <CheckCircle className="h-16 w-16 mx-auto text-green-600 mb-4" />
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        Audit Complete! 🎉
                      </h4>
                      <p className="text-gray-600 mb-4">
                        Great news! Your website scored an average of{" "}
                        <span className="font-bold text-green-600">
                          {Math.round(
                            auditSteps.reduce(
                              (sum, step) => sum + (step.result?.score || 0),
                              0,
                            ) / auditSteps.length,
                          )}
                          %
                        </span>
                      </p>
                    </div>

                    <Button
                      onClick={() => setCurrentStep(3)}
                      className="w-full"
                      size="lg"
                    >
                      Continue to Analytics Setup
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <BarChart3 className="h-16 w-16 mx-auto text-purple-600 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Connect Your Analytics
                </h3>
                <p className="text-gray-600">
                  Link Google Analytics 4 and Search Console for powerful
                  insights and automated reporting.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card
                  className={ga4Connected ? "bg-green-50 border-green-200" : ""}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <BarChart3 className="h-8 w-8 text-blue-600" />
                      <div>
                        <h4 className="font-semibold">Google Analytics 4</h4>
                        <p className="text-sm text-gray-600">
                          Track user behavior and conversions
                        </p>
                      </div>
                    </div>

                    {ga4Connected ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-medium">
                          Connected successfully!
                        </span>
                      </div>
                    ) : (
                      <Button onClick={connectGA4} className="w-full">
                        <Shield className="h-4 w-4 mr-2" />
                        Connect GA4
                      </Button>
                    )}
                  </CardContent>
                </Card>

                <Card
                  className={gscConnected ? "bg-green-50 border-green-200" : ""}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Search className="h-8 w-8 text-green-600" />
                      <div>
                        <h4 className="font-semibold">Search Console</h4>
                        <p className="text-sm text-gray-600">
                          Monitor search performance
                        </p>
                      </div>
                    </div>

                    {gscConnected ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-medium">
                          Connected successfully!
                        </span>
                      </div>
                    ) : (
                      <Button onClick={connectGSC} className="w-full">
                        <Shield className="h-4 w-4 mr-2" />
                        Connect GSC
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>

              {ga4Connected && gscConnected && (
                <div className="text-center">
                  <Button
                    onClick={() => {
                      completeStep("analytics-setup");
                      setCurrentStep(4);
                    }}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    size="lg"
                  >
                    Continue to Content Strategy
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
            >
              Previous
            </Button>

            <div className="flex gap-2">
              {currentStepData?.optional && (
                <Button
                  variant="outline"
                  onClick={() =>
                    setCurrentStep(Math.min(totalSteps - 1, currentStep + 1))
                  }
                >
                  Skip
                </Button>
              )}

              {currentStep < totalSteps - 1 && (
                <Button
                  onClick={() =>
                    setCurrentStep(Math.min(totalSteps - 1, currentStep + 1))
                  }
                  disabled={
                    !currentStepData?.completed && !currentStepData?.optional
                  }
                >
                  Next
                </Button>
              )}

              {currentStep === totalSteps - 1 && (
                <Button
                  onClick={onComplete}
                  className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                >
                  Complete Setup 🎉
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
