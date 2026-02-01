import React, { useState, useCallback } from 'react';
import { cn } from '../../lib/utils';

interface ValidationRule {
  validate: (value: string) => boolean;
  message: string;
}

interface FieldConfig {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  patternMessage?: string;
  custom?: ValidationRule[];
}

interface FormFieldProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  showStrength?: boolean;
}

export function FormField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  error,
  hint,
  required,
  disabled,
  placeholder,
  className,
  showStrength
}: FormFieldProps) {
  const [focused, setFocused] = useState(false);
  const [touched, setTouched] = useState(false);

  const showError = touched && error;

  return (
    <div className={cn("space-y-1.5", className)}>
      <label 
        htmlFor={id}
        className={cn(
          "block text-sm font-medium transition-colors duration-200",
          showError ? "text-red-600" : focused ? "text-teal-600" : "text-gray-700"
        )}
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); setTouched(true); }}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            "w-full px-4 py-2.5 rounded-lg border transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-offset-0",
            disabled && "bg-gray-100 cursor-not-allowed opacity-60",
            showError 
              ? "border-red-300 focus:border-red-500 focus:ring-red-200" 
              : "border-gray-300 focus:border-teal-500 focus:ring-teal-200"
          )}
          aria-invalid={showError ? 'true' : 'false'}
          aria-describedby={showError ? `${id}-error` : hint ? `${id}-hint` : undefined}
        />
        
        {showError && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>

      {showStrength && type === 'password' && value && (
        <PasswordStrength password={value} />
      )}

      {showError ? (
        <p id={`${id}-error`} className="text-sm text-red-600 flex items-center gap-1.5 animate-fadeIn">
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-gray-500">{hint}</p>
      ) : null}
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const getStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;
    return score;
  };

  const strength = getStrength(password);
  const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500'];

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-all duration-300",
              i < strength ? colors[strength - 1] : "bg-gray-200"
            )}
          />
        ))}
      </div>
      <p className={cn(
        "text-xs transition-colors duration-200",
        strength <= 1 ? "text-red-600" : strength <= 2 ? "text-yellow-600" : "text-green-600"
      )}>
        {labels[strength - 1] || 'Enter a password'}
      </p>
    </div>
  );
}

export function useFormValidation<T extends Record<string, string>>(
  initialValues: T,
  validationConfig: Record<keyof T, FieldConfig>
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  const validateField = useCallback((name: keyof T, value: string): string | undefined => {
    const config = validationConfig[name];
    if (!config) return undefined;

    if (config.required && !value.trim()) {
      return 'This field is required';
    }

    if (config.minLength && value.length < config.minLength) {
      return `Must be at least ${config.minLength} characters`;
    }

    if (config.maxLength && value.length > config.maxLength) {
      return `Must be no more than ${config.maxLength} characters`;
    }

    if (config.pattern && !config.pattern.test(value)) {
      return config.patternMessage || 'Invalid format';
    }

    if (config.custom) {
      for (const rule of config.custom) {
        if (!rule.validate(value)) {
          return rule.message;
        }
      }
    }

    return undefined;
  }, [validationConfig]);

  const setValue = useCallback((name: keyof T, value: string) => {
    setValues(prev => ({ ...prev, [name]: value }));
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  }, [touched, validateField]);

  const setFieldTouched = useCallback((name: keyof T) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, values[name]);
    setErrors(prev => ({ ...prev, [name]: error }));
  }, [validateField, values]);

  const validateAll = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    for (const key of Object.keys(values) as (keyof T)[]) {
      const error = validateField(key, values[key]);
      if (error) {
        newErrors[key] = error;
        isValid = false;
      }
    }

    setErrors(newErrors);
    setTouched(Object.keys(values).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
    return isValid;
  }, [values, validateField]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    setValue,
    setFieldTouched,
    validateAll,
    reset,
    isValid: Object.keys(errors).length === 0
  };
}

export const commonValidations = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    patternMessage: 'Please enter a valid email address'
  },
  phone: {
    pattern: /^[\d\s\-+()]{10,}$/,
    patternMessage: 'Please enter a valid phone number'
  },
  walletAddress: {
    pattern: /^0x[a-fA-F0-9]{40}$/,
    patternMessage: 'Please enter a valid Ethereum address'
  },
  url: {
    pattern: /^https?:\/\/.+\..+/,
    patternMessage: 'Please enter a valid URL'
  }
};
