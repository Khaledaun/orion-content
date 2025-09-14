"use client";

import { useState } from "react";
import { Button } from "./button";
import { LoadingSpinner } from "./loading-spinner";
import { cn } from "@/lib/utils";

interface EnhancedFormProps {
  children: React.ReactNode;
  onSubmit: (data: FormData) => Promise<void>;
  className?: string;
  submitText?: string;
  loadingText?: string;
}

export function EnhancedForm({
  children,
  onSubmit,
  className,
  submitText = "Submit",
  loadingText = "Submitting...",
}: EnhancedFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-4", className)}>
      {children}

      {error && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? (
          <>
            <LoadingSpinner size="sm" className="mr-2" />
            {loadingText}
          </>
        ) : (
          submitText
        )}
      </Button>
    </form>
  );
}

interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
}

export function FormField({
  label,
  name,
  type = "text",
  required = false,
  placeholder,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={name} className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        id={name}
        name={name}
        required={required}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  );
}
