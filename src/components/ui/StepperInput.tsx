import React, { InputHTMLAttributes, forwardRef } from 'react';

export interface StepperInputProps extends InputHTMLAttributes<HTMLInputElement> {
  unit?: string;
  onValueChange?: (value: number | string) => void;
}

export const StepperInput = forwardRef<HTMLInputElement, StepperInputProps>(({
  unit, onValueChange, onChange, className, min, max, step = 1, disabled, value, ...props
}, ref) => {
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const handleRef = (el: HTMLInputElement | null) => {
    inputRef.current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref && 'current' in ref) (ref as any).current = el;
  };

  const parseVal = (v: any) => {
    if (v === '' || v === null || v === undefined) return NaN;
    return Number(v);
  };

  const handleDec = () => {
    if (disabled) return;
    const current = parseVal(value !== undefined ? value : inputRef.current?.value);
    if (isNaN(current)) return;
    
    // Ondalık hatalarını önlemek için ufak bir yuvarlama yapabiliriz
    const s = Number(step) || 1;
    let next = current - s;
    if (min !== undefined && next < Number(min)) next = Number(min);
    
    // Float precision fix (örn. 0.3 - 0.1 = 0.1999999)
    next = parseFloat(next.toFixed(5));

    if (onValueChange) onValueChange(next);
    triggerNativeChange(next);
  };

  const handleInc = () => {
    if (disabled) return;
    const current = parseVal(value !== undefined ? value : inputRef.current?.value);
    let next;
    
    if (isNaN(current)) {
      next = min !== undefined ? Number(min) : 0;
    } else {
      const s = Number(step) || 1;
      next = current + s;
      if (max !== undefined && next > Number(max)) next = Number(max);
      next = parseFloat(next.toFixed(5));
    }
    
    if (onValueChange) onValueChange(next);
    triggerNativeChange(next);
  };

  const triggerNativeChange = (newVal: number) => {
    if (!inputRef.current) return;
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(inputRef.current, String(newVal));
    }
    
    const ev = new Event('input', { bubbles: true });
    inputRef.current.dispatchEvent(ev);
    
    const ev2 = new Event('change', { bubbles: true });
    inputRef.current.dispatchEvent(ev2);
  };

  return (
    <div className={`flex items-center p-1 border border-border-main rounded-[20px] bg-white w-full sm:w-fit shadow-sm ${disabled ? 'opacity-60 pointer-events-none' : ''} ${className || ''}`}>
      <button 
        type="button" 
        onClick={handleDec} 
        disabled={disabled} 
        className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors shrink-0 text-xl"
        aria-label="Azalt"
      >
        -
      </button>
      <div className="flex flex-1 items-center justify-center px-3 min-w-40">
        <input
          {...props}
          type="number"
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          value={value}
          onChange={onChange}
          ref={handleRef}
          className="flex-1 min-w-0 text-center outline-none text-base font-bold text-text-primary placeholder:font-medium placeholder:text-text-secondary bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        {unit && <span className="text-[13px] font-bold text-text-secondary ml-1 whitespace-nowrap">{unit}</span>}
      </div>
      <button 
        type="button" 
        onClick={handleInc} 
        disabled={disabled} 
        className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors shrink-0 text-xl"
        aria-label="Artır"
      >
        +
      </button>
    </div>
  );
});

StepperInput.displayName = 'StepperInput';
