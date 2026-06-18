'use client';

import { useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useOnboarding } from '@/lib/onboarding/useOnboarding';
import { usePathname } from 'next/navigation';

// We inject the CSS override globally or here
const driverCssOverride = `
  .odi-driver-popover {
    border-radius: 24px !important;
    padding: 24px !important;
    font-family: inherit !important;
    border: 1px solid rgba(255,255,255,0.5) !important;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
  }
  .odi-driver-popover .driver-popover-title {
    font-size: 17px !important;
    font-weight: 900 !important;
    color: #1e293b !important;
    margin-bottom: 8px !important;
  }
  .odi-driver-popover .driver-popover-description {
    font-size: 14px !important;
    color: #475569 !important;
    font-weight: 500 !important;
    line-height: 1.6 !important;
    margin-bottom: 12px !important;
  }
  /* Next/Done buttons */
  .driver-popover-footer {
    display: flex !important;
    justify-content: flex-end !important;
    gap: 8px !important;
    margin-top: 12px !important;
  }
  .driver-popover-next-btn, .driver-popover-prev-btn {
    border-radius: 12px !important;
    padding: 8px 16px !important;
    font-size: 13px !important;
    font-weight: 700 !important;
    border: none !important;
    cursor: pointer !important;
    transition: all 0.2s !important;
  }
  .driver-popover-next-btn {
    background-color: #6C5CE7 !important;
    color: white !important;
  }
  .driver-popover-next-btn:hover {
    background-color: #5b4cc4 !important;
  }
  .driver-popover-prev-btn {
    background-color: #f1f5f9 !important;
    color: #475569 !important;
  }
  .driver-popover-prev-btn:hover {
    background-color: #e2e8f0 !important;
  }
  /* Hide the close button completely */
  .driver-popover-close-btn {
    display: none !important;
  }
  /* The active element highlight border */
  div#driver-highlighted-element-stage {
    border: 2px solid #6C5CE7 !important;
    border-radius: 16px !important;
  }
  /* Hide footer for action-based tour */
  .action-tour-popover .driver-popover-footer {
    display: none !important;
  }
`;

export interface TourStep {
  targetId: string;
  title: string;
  message: string;
  icon?: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface SpotlightTourProps {
  steps?: TourStep[];
  onComplete?: () => void;
}

export default function SpotlightTour({ steps, onComplete }: SpotlightTourProps = {}) {
  const { activeStep, isReady, isEnabled, completeStepByTrigger } = useOnboarding();
  const pathname = usePathname();
  const driverObj = useRef<any>(null);
  const hasStarted = useRef(false);
  const currentStepIndexRef = useRef(0);
  const isUnmounting = useRef(false);

  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    // Inject custom CSS
    const styleId = 'odi-driver-css';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = driverCssOverride;
      document.head.appendChild(style);
    }
  }, []);

  // Effect 1: Wizard-driven tour
  useEffect(() => {
    console.log('[SpotlightTour Effect 1] steps length:', steps?.length, 'isReady:', isReady, 'isEnabled:', isEnabled, 'hasStarted:', hasStarted.current);
    if (!steps || steps.length === 0) return;
    if (!isReady || !isEnabled) return;

    if (hasStarted.current) return;

    // Check if splash screen is active and wait for it
    const checkSplash = setInterval(() => {
      if (document.body.classList.contains('odi-splash-active')) {
        return;
      }
      clearInterval(checkSplash);

      if (hasStarted.current) return;
      hasStarted.current = true;
      isUnmounting.current = false;

      const driveSteps = steps.map(s => ({
        element: `#${s.targetId}`,
        popover: {
          title: s.title,
          description: s.message,
          side: s.position || 'bottom',
          align: 'start' as const
        }
      }));

      console.log('[SpotlightTour Effect 1] Initializing driver.js for Wizard');
      const inst = driver({
        showProgress: false,
        showButtons: ['next'], // only show Next (which becomes Done at the last step)
        allowClose: false,
        overlayColor: 'rgba(0, 0, 0, 0.65)',
        popoverClass: 'odi-driver-popover',
        nextBtnText: 'Devam Et',
        doneBtnText: 'Başla 🐾',
        onNextClick: (el, step, { config, state }) => {
          if (state.activeIndex === driveSteps.length - 1) {
            inst.destroy();
            if (onCompleteRef.current) onCompleteRef.current();
          } else {
            if (step.element === '#nav-action-btn') {
              const nextEl = document.querySelector('#action-btn-plan-yap');
              if (!nextEl) {
                const btn = document.querySelector('#nav-action-btn') as HTMLElement;
                if (btn) btn.click();
              }
            }
            inst.moveNext();
          }
        },
        onDestroyStarted: () => {
          if (!isUnmounting.current) {
            if (onCompleteRef.current) onCompleteRef.current();
            inst.destroy();
          }
        }
      });

      driverObj.current = inst;

      inst.setConfig({
        ...inst.getConfig(),
        steps: driveSteps
      });

      // Start the tour
      console.log('[SpotlightTour Effect 1] Calling inst.drive() with steps:', driveSteps);
      inst.drive();
    }, 200);

    return () => {
      console.log('[SpotlightTour Effect 1] Unmounting');
      clearInterval(checkSplash);
      isUnmounting.current = true;
      if (driverObj.current) {
        driverObj.current.destroy();
        driverObj.current = null;
      }
      hasStarted.current = false;
    };
  }, [steps, isReady, isEnabled]);

  // Effect 2: Global action-driven tour
  useEffect(() => {
    console.log('[SpotlightTour Effect 2] steps length:', steps?.length, 'isReady:', isReady, 'isEnabled:', isEnabled);
    // If steps are provided, this component is dedicated to the wizard, so skip the global tour
    if (steps && steps.length > 0) return;

    if (!isReady || !isEnabled) return;

    const globalDriver = driver({
      showProgress: false,
      showButtons: [], // remove buttons, pure action based
      allowClose: false,
      overlayColor: 'rgba(0, 0, 0, 0.65)',
      popoverClass: 'odi-driver-popover action-tour-popover',
    });

    driverObj.current = globalDriver;

    if (activeStep) {
      console.log('[SpotlightTour Effect 2] Active step found:', activeStep.key, 'target:', activeStep.target);
      // Retry logic for elements that might render lazily
      let attempts = 0;
      const interval = setInterval(() => {
        // Wait for splash screen to finish
        if (document.body.classList.contains('odi-splash-active')) {
          return;
        }

        const el = document.querySelector(activeStep.target);
        if (el) {
          console.log('[SpotlightTour Effect 2] Element found! Highlighting', activeStep.target);
          clearInterval(interval);
          globalDriver.highlight({
            element: activeStep.target,
            popover: {
              title: activeStep.title,
              description: activeStep.description,
              side: activeStep.position,
              align: 'start'
            }
          });
        } else {
          console.log('[SpotlightTour Effect 2] Attempt', attempts, 'Element NOT found:', activeStep.target);
        }
        attempts++;
        if (attempts > 10) clearInterval(interval); // give up after 5 seconds
      }, 500);

      const handleClick = (e: MouseEvent) => {
        if (activeStep.completionTrigger.startsWith('click:')) {
          const el = document.querySelector(activeStep.target);
          if (el && el.contains(e.target as Node)) {
            // Give it a tiny delay so the navigation/action triggers first
            setTimeout(() => {
              completeStepByTrigger(activeStep.completionTrigger);
            }, 100);
          }
        }
      };

      document.addEventListener('click', handleClick, true);
      
      return () => {
        clearInterval(interval);
        document.removeEventListener('click', handleClick, true);
        globalDriver.destroy();
        driverObj.current = null;
      };
    } else {
      globalDriver.destroy();
      driverObj.current = null;
      return () => {};
    }
  }, [steps, activeStep, isReady, isEnabled, completeStepByTrigger, pathname]);

  return null;
}
