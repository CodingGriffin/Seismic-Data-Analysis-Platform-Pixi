import React, { InputHTMLAttributes } from 'react';

interface ValidationRule {
  validate: (value: string) => boolean;
  message: string;
}

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  value: string | number;
  onChange: (value: string) => void;
  validation?: ValidationRule[];
  error?: string;
  touched?: boolean;
  helperText?: string;
  fullWidth?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  value,
  onChange,
  validation = [],
  error,
  touched = false,
  helperText,
  fullWidth = false,
  type = 'text',
  className = '',
  ...props
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const isInvalid = touched && error;
  const isValid = touched && !error && value !== '';

  const inputClassName = `
    form-control
    ${isInvalid ? 'is-invalid' : ''}
    ${isValid ? 'is-valid' : ''}
    ${fullWidth ? 'w-100' : ''}
    ${className}
  `.trim();

  return (
    <div className={`mb-3 ${fullWidth ? 'w-100' : ''}`}>
      {label && (
        <label className="form-label">
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={handleChange}
        className={inputClassName}
        {...props}
      />
      {helperText && !error && (
        <div className="form-text">
          {helperText}
        </div>
      )}
      {isInvalid && (
        <div className="invalid-feedback">
          {error}
        </div>
      )}
    </div>
  );
};