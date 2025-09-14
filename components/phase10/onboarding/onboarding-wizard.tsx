"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Circle,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useDictionary, useLanguage } from "@/lib/i18n/language-context";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { LoadingState, ErrorState } from "@/components/ui/enhanced-states";
import {
  SkipLink,
  LiveRegion,
  useFocusManagement,
} from "@/components/ui/accessibility";
import { WordPressStep } from "./steps/wordpress-step";
import { GSCStep } from "./steps/gsc-step";
import { GA4Step } from "./steps/ga4-step";
import { CompletionStep } from "./steps/completion-step";

interface OnboardingStatus {
  id: string;
  steps: {
    wordpress: boolean;
    gsc: boolean;
    ga4: boolean;
  };
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
  isCompleted: boolean;
  completedAt?: string;
}

export function OnboardingWizard() {
  const router = useRouter();
  const dict = useDictionary();
  const { isRTL } = useLanguage();
  const { focusMainContent, announcePage } = useFocusManagement();

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [stepLoading, setStepLoading] = useState(false);

  // Define steps with i18n support
  const STEPS = [
    {
      id: "wordpress",
      title: dict.onboarding.wordpress.title,
      description: dict.onboarding.wordpress.description,
      component: WordPressStep,
    },
    {
      id: "gsc",
      title: dict.onboarding.gsc.title,
      description: dict.onboarding.gsc.description,
      component: GSCStep,
    },
    {
      id: "ga4",
      title: dict.onboarding.ga4.title,
      description: dict.onboarding.ga4.description,
      component: GA4Step,
    },
    {
      id: "complete",
      title: dict.onboarding.completion.title,
      description: dict.onboarding.completion.description,
      component: CompletionStep,
    },
  ];

  // Load onboarding status
  useEffect(() => {
    loadStatus();
  }, []);

  // Announce step changes to screen readers
  useEffect(() => {
    if (status && !loading) {
      const currentStepConfig = STEPS[currentStep];
      announcePage(
        `${dict.onboarding.step} ${currentStep + 1} ${dict.onboarding.of} ${STEPS.length}: ${currentStepConfig.title}`,
      );
    }
  }, [currentStep, status, loading, announcePage, dict, STEPS]);

  const loadStatus = async () => {
    try {
      setError(null);
      const response = await fetch("/api/onboarding");
      if (!response.ok) {
        throw new Error("Failed to load onboarding status");
      }

      const data = await response.json();
      setStatus(data);

      // Set current step based on progress
      if (data.isCompleted) {
        setCurrentStep(STEPS.length - 1); // Show completion step
      } else {
        // Find first incomplete step
        let nextStep = 0;
        if (data.steps.wordpress) nextStep = 1;
        if (data.steps.gsc) nextStep = 2;
        if (data.steps.ga4) nextStep = 3;
        setCurrentStep(nextStep);
      }
    } catch (error) {
      console.error("Failed to load onboarding status:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load onboarding status",
      );
      toast.error(dict.errors.generic);
    } finally {
      setLoading(false);
    }
  };

  const handleStepComplete = async (stepId: string, data?: any) => {
    setStepLoading(true);

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: stepId,
          ...data,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to complete step");
      }

      const updatedStatus = await response.json();
      setStatus(updatedStatus);

      toast.success(
        `${STEPS[currentStep].title} ${dict.onboarding.completed}!`,
      );

      // Move to next step or completion
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(currentStep + 1);
        // Focus the next step for keyboard users
        setTimeout(() => {
          const nextStepContent = document.querySelector('[role="main"] h3');
          if (nextStepContent instanceof HTMLElement) {
            nextStepContent.focus();
          }
        }, 100);
      }

      // If all done, redirect to dashboard after a delay
      if (updatedStatus.isCompleted) {
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      }
    } catch (error) {
      console.error("Failed to complete step:", error);
      toast.error(dict.errors.generic);
    } finally {
      setStepLoading(false);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      focusMainContent();
    }
  };

  const handleSkipToEnd = () => {
    if (
      confirm(
        "Are you sure you want to skip the setup? You can always complete it later.",
      )
    ) {
      router.push("/dashboard");
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          handlePrevStep();
          break;
        case "ArrowRight":
          event.preventDefault();
          if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
            focusMainContent();
          }
          break;
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingState message={dict.common.loading} size="lg" fullScreen />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <ErrorState
          message={dict.errors.generic}
          error={error}
          onRetry={loadStatus}
          retryLabel={dict.common.retry}
          fullScreen
          showDetails
        />
      </div>
    );
  }

  if (!status) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              {dict.errors.generic}
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => window.location.reload()} className="w-full">
              {dict.common.refresh}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const currentStepConfig = STEPS[currentStep];
  const CurrentStepComponent = currentStepConfig.component;

  return (
    <div
      className={`min-h-screen bg-gray-50 ${isRTL ? "rtl" : "ltr"}`}
      onKeyDown={handleKeyDown}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <SkipLink href="#main-content">{dict.accessibility.skipToMain}</SkipLink>

      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {dict.onboarding.title}
              </h1>
              <p className="text-sm text-gray-500">
                {dict.onboarding.subtitle}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <LanguageSwitcher showText />
              <Button
                variant="ghost"
                onClick={handleSkipToEnd}
                className="text-gray-500 hover:text-gray-700"
                aria-label={`${dict.common.skip} ${dict.onboarding.title}`}
              >
                {dict.common.skip}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Section */}
      <main
        id="main-content"
        className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        role="main"
        aria-label={dict.onboarding.title}
        tabIndex={-1}
      >
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">
              {dict.onboarding.progress}
            </h2>
            <Badge
              variant="secondary"
              aria-label={`${status.progress.completed} ${dict.onboarding.of} ${status.progress.total} ${dict.onboarding.completed}`}
            >
              {status.progress.completed} {dict.onboarding.of}{" "}
              {status.progress.total} {dict.onboarding.completed}
            </Badge>
          </div>

          <div className="mb-6">
            <Progress
              value={status.progress.percentage}
              className="h-2"
              aria-label={`${dict.onboarding.progress}: ${status.progress.percentage}%`}
            />
            <LiveRegion level="polite" className="sr-only">
              {dict.onboarding.progress}: {status.progress.percentage}%{" "}
              {dict.onboarding.completed}
            </LiveRegion>
          </div>

          {/* Step indicators */}
          <nav
            aria-label={`${dict.onboarding.title} ${dict.onboarding.progress}`}
            className="flex items-center justify-between"
          >
            {STEPS.slice(0, -1).map((step, index) => {
              const isCompleted =
                status.steps[step.id as keyof typeof status.steps];
              const isCurrent = index === currentStep;

              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`flex items-center space-x-2 ${
                      isCurrent
                        ? "text-blue-600"
                        : isCompleted
                          ? "text-green-600"
                          : "text-gray-400"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle
                        className="h-6 w-6"
                        aria-label={`${step.title} ${dict.onboarding.completed}`}
                      />
                    ) : (
                      <Circle
                        className={`h-6 w-6 ${isCurrent ? "fill-current" : ""}`}
                        aria-label={
                          isCurrent
                            ? `${dict.onboarding.step} ${index + 1}: ${step.title}`
                            : step.title
                        }
                      />
                    )}
                    <span className="text-sm font-medium hidden sm:inline">
                      {step.title}
                    </span>
                  </div>

                  {index < STEPS.length - 2 && (
                    <ArrowRight
                      className={`h-4 w-4 text-gray-300 mx-4 ${isRTL ? "rotate-180" : ""}`}
                      aria-hidden="true"
                    />
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Current Step Content */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === STEPS.length - 1
                    ? "bg-green-100 text-green-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {currentStep + 1}
              </div>
              <div>
                <CardTitle>
                  <h3 tabIndex={-1}>{currentStepConfig.title}</h3>
                </CardTitle>
                <CardDescription>
                  {currentStepConfig.description}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <CurrentStepComponent
              onComplete={handleStepComplete}
              loading={stepLoading}
              status={status}
            />
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevStep}
              disabled={currentStep === 0 || stepLoading}
              className="gap-2"
              aria-label={`${dict.common.previous} ${dict.onboarding.step}`}
            >
              <ArrowLeft className={`h-4 w-4 ${isRTL ? "rotate-180" : ""}`} />
              {dict.common.previous}
            </Button>

            <div className="flex items-center space-x-2">
              {currentStep === STEPS.length - 1 && (
                <Button
                  onClick={() => router.push("/dashboard")}
                  aria-label={dict.onboarding.completion.goToDashboard}
                >
                  {dict.onboarding.completion.goToDashboard}
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
