import { useState, useCallback } from 'react';

interface ValidationRule {
  validate: (value: string) => boolean;
  message: string;
}

interface UseInputValidationProps {
  initialValue?: string;
  validation?: ValidationRule[];
}

export const useInputValidation = ({ 
  initialValue = '', 
  validation = [] 
}: UseInputValidationProps) => {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string>('');
  const [touched, setTouched] = useState(false);

  const validate = useCallback((valueToValidate: string) => {
    for (const rule of validation) {
      if (!rule.validate(valueToValidate)) {
        setError(rule.message);
        return false;
      }
    }
    setError('');
    return true;
  }, [validation]);

  const handleChange = useCallback((newValue: string) => {
    setValue(newValue);
    if (touched) {
      validate(newValue);
    }
  }, [touched, validate]);

  const handleBlur = useCallback(() => {
    setTouched(true);
    validate(value);
  }, [value, validate]);

  return {
    value,
    error,
    touched,
    handleChange,
    handleBlur,
    setValue,
    setTouched
  };
};