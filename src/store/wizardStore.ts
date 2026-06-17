import { create } from 'zustand';

interface WizardState {
  stepIndex: number;
  wizardData: Record<string, any>;
  setStepData: (data: Record<string, any>) => void;
  nextStep: () => void;
  prevStep: () => void;
  resetWizard: () => void;
}

export const useWizardStore = create<WizardState>((set) => ({
  stepIndex: 0,
  wizardData: {},
  setStepData: (data) => set((state) => ({ 
    wizardData: { ...state.wizardData, ...data } 
  })),
  nextStep: () => set((state) => ({ stepIndex: state.stepIndex + 1 })),
  prevStep: () => set((state) => ({ stepIndex: Math.max(0, state.stepIndex - 1) })),
  resetWizard: () => set({ stepIndex: 0, wizardData: {} }),
}));
