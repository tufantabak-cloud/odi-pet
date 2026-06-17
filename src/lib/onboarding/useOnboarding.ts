'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ONBOARDING_STEPS, GuideStep } from './GuideConfig';

export function useOnboarding() {
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [isEnabled, setIsEnabled] = useState(true);
  const [isReady, setIsReady] = useState(false);

  const completeStep = useCallback(async (stepKey: string) => {
    if (!isEnabled) return;
    
    setCompletedSteps(prev => {
      if (prev.includes(stepKey)) return prev;
      return [...prev, stepKey];
    });

    try {
      await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete_step', stepId: stepKey })
      });
    } catch (e) {
      console.error('Failed to save step completion', e);
    }
  }, [isEnabled]);

  const completeStepByTrigger = useCallback((trigger: string) => {
    const step = ONBOARDING_STEPS.find(s => s.completionTrigger === trigger);
    if (step && !completedSteps.includes(step.key)) {
      completeStep(step.key);
    }
  }, [completedSteps, completeStep]);

  const completedStepsRef = useRef<string[]>([]);
  const completeStepRef = useRef(completeStep);

  useEffect(() => {
    completedStepsRef.current = completedSteps;
  }, [completedSteps]);

  useEffect(() => {
    completeStepRef.current = completeStep;
  }, [completeStep]);

  useEffect(() => {
    // Check ENV or localStorage for testing
    const isTestDisabled = typeof window !== 'undefined' && window.localStorage.getItem('onboarding_disabled') === 'true';
    if (process.env.NEXT_PUBLIC_ONBOARDING_ENABLED === 'false' || isTestDisabled) {
      setIsEnabled(false);
      setIsReady(true);
      return;
    }

    // Fetch progress
    fetch('/api/onboarding')
      .then(res => res.json())
      .then(data => {
        if (data && data.completedSteps) {
          setCompletedSteps(data.completedSteps);
        }
        setIsReady(true);
      })
      .catch(err => {
        console.error('Failed to load onboarding progress', err);
        setIsReady(true);
      });
  }, []);

  useEffect(() => {
    // Global fetch interceptor for api:* triggers
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      
      try {
        const [resource, config] = args;
        const method = config?.method?.toUpperCase() || 'GET';
        let url = '';
        if (typeof resource === 'string') url = resource;
        else if (resource instanceof Request) url = resource.url;
        else if (resource instanceof URL) url = resource.toString();

        if (url && response.ok) {
          // Check triggers like api:POST:/api/journal
          const pathname = new URL(url, window.location.origin).pathname;
          const trigger = `api:${method}:${pathname}`;
          const step = ONBOARDING_STEPS.find(s => s.completionTrigger === trigger);
          if (step && !completedStepsRef.current.includes(step.key)) {
            // Trigger completion
            completeStepRef.current(step.key);
          }
        }
      } catch (e) {
        // ignore interceptor errors
      }
      
      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);



  // Find the first uncompleted step in ONBOARDING_STEPS sequence
  const currentStepIndex = ONBOARDING_STEPS.findIndex(s => !completedSteps.includes(s.key));
  const activeStep = currentStepIndex !== -1 ? ONBOARDING_STEPS[currentStepIndex] : null;

  return {
    isEnabled,
    isReady,
    activeStep,
    currentStepIndex,
    completedSteps,
    completeStep,
    completeStepByTrigger
  };
}
