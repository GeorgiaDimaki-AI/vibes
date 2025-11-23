'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { WelcomeStep } from './WelcomeStep';
import { RegionStep } from './RegionStep';
import { InterestsStep } from './InterestsStep';
import { StyleStep } from './StyleStep';
import { TryItStep } from './TryItStep';
import { TourStep } from './TourStep';
import { useOnboarding } from '@/lib/hooks/useOnboarding';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

const steps = [
  { id: 'welcome', title: 'Welcome', Component: WelcomeStep },
  { id: 'region', title: 'Region', Component: RegionStep },
  { id: 'interests', title: 'Interests', Component: InterestsStep },
  { id: 'style', title: 'Style', Component: StyleStep },
  { id: 'tryit', title: 'Try It', Component: TryItStep },
  { id: 'tour', title: 'Tour', Component: TourStep },
];

export function OnboardingWizard() {
  const router = useRouter();
  const { user } = useUser();
  const {
    currentStep,
    profile,
    setProfile,
    nextStep,
    prevStep,
    completeOnboarding,
    isCompleting,
  } = useOnboarding();

  const CurrentStepComponent = steps[currentStep].Component;
  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleSkip = async () => {
    // Save minimal profile and redirect to dashboard
    await completeOnboarding();
  };

  const handleNext = () => {
    nextStep();
  };

  const handleBack = () => {
    prevStep();
  };

  const handleComplete = async () => {
    await completeOnboarding();
  };

  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header with progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Zeitgeist
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Setup ({currentStep + 1}/{steps.length})
            </span>
          </div>
          <button
            onClick={handleSkip}
            className="flex items-center gap-1 px-3 py-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            aria-label="Skip onboarding"
          >
            <X size={16} />
            Skip
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={currentStep + 1}
            aria-valuemin={1}
            aria-valuemax={steps.length}
            aria-label={`Step ${currentStep + 1} of ${steps.length}`}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-6">
        <CurrentStepComponent
          profile={profile}
          setProfile={setProfile}
          onNext={handleNext}
          onComplete={handleComplete}
        />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleBack}
          disabled={isFirstStep}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous step"
        >
          <ChevronLeft size={20} />
          Back
        </button>

        <div className="flex gap-2">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentStep
                  ? 'bg-purple-600'
                  : index < currentStep
                  ? 'bg-purple-300'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
              aria-label={`Step ${index + 1}: ${step.title}`}
              aria-current={index === currentStep ? 'step' : undefined}
            />
          ))}
        </div>

        {!isLastStep ? (
          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
            aria-label="Next step"
          >
            Next
            <ChevronRight size={20} />
          </button>
        ) : (
          <button
            onClick={handleComplete}
            disabled={isCompleting}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            aria-label="Complete onboarding"
            aria-busy={isCompleting}
          >
            {isCompleting ? 'Completing...' : 'Get Started'}
          </button>
        )}
      </div>
    </div>
  );
}
