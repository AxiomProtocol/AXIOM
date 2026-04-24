import { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface FormFieldProps {
  label: string;
  children: React.ReactNode;
}

export function FormField({ label, children }: FormFieldProps) {
  return (
    <div>
      <label className="block text-xs text-dl-gray mb-1">{label}</label>
      {children}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function DLInput(props: InputProps) {
  return (
    <input
      {...props}
      className={`w-full border border-dl-border px-3 py-1.5 text-sm font-dl-mono bg-dl-bg ${props.className || ''}`}
    />
  );
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function DLTextarea(props: TextareaProps) {
  return (
    <textarea
      {...props}
      className={`w-full border border-dl-border px-3 py-1.5 text-sm bg-dl-bg ${props.className || ''}`}
    />
  );
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export function DLSelect(props: SelectProps) {
  return (
    <select
      {...props}
      className={`border border-dl-border bg-dl-bg text-sm px-3 py-1.5 font-dl-mono ${props.className || ''}`}
    />
  );
}
