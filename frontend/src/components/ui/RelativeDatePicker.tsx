import React, { useState, useEffect } from 'react';

interface RelativeDateOption {
  id: string;
  label: string;
  getValue: () => string; // Returns ISO date string
  getDisplayValue: () => string; // Returns human-readable text
}

interface RelativeDatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  error?: string;
  disabled?: boolean;
}

export const RelativeDatePicker: React.FC<RelativeDatePickerProps> = ({
  value,
  onChange,
  label,
  placeholder = "Select date",
  className = "",
  error,
  disabled = false,
}) => {
  const [mode, setMode] = useState<'absolute' | 'relative'>('absolute');
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [customDays, setCustomDays] = useState<number>(1);
  const [customMonths, setCustomMonths] = useState<number>(1);
  const [customYears, setCustomYears] = useState<number>(1);
  const [absoluteDate, setAbsoluteDate] = useState<string>('');

  // Predefined relative date options
  const relativeOptions: RelativeDateOption[] = [
    {
      id: 'today',
      label: 'Today',
      getValue: () => new Date().toISOString(),
      getDisplayValue: () => 'Today'
    },
    {
      id: 'tomorrow',
      label: 'Tomorrow',
      getValue: () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString();
      },
      getDisplayValue: () => 'Tomorrow'
    },
    {
      id: 'next_week',
      label: 'Next week',
      getValue: () => {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        return nextWeek.toISOString();
      },
      getDisplayValue: () => 'Next week'
    },
    {
      id: 'next_month',
      label: 'Next month',
      getValue: () => {
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return nextMonth.toISOString();
      },
      getDisplayValue: () => 'Next month'
    },
    {
      id: 'custom_days',
      label: 'In X days',
      getValue: () => {
        const date = new Date();
        date.setDate(date.getDate() + customDays);
        return date.toISOString();
      },
      getDisplayValue: () => `In ${customDays} day${customDays !== 1 ? 's' : ''}`
    },
    {
      id: 'custom_months',
      label: 'In X months',
      getValue: () => {
        const date = new Date();
        date.setMonth(date.getMonth() + customMonths);
        return date.toISOString();
      },
      getDisplayValue: () => `In ${customMonths} month${customMonths !== 1 ? 's' : ''}`
    },
    {
      id: 'custom_years',
      label: 'In X years',
      getValue: () => {
        const date = new Date();
        date.setFullYear(date.getFullYear() + customYears);
        return date.toISOString();
      },
      getDisplayValue: () => `In ${customYears} year${customYears !== 1 ? 's' : ''}`
    }
  ];

  // Initialize component based on existing value
  useEffect(() => {
    if (value) {
      // Try to parse the value - if it's a valid ISO date, use absolute mode
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          setMode('absolute');
          setAbsoluteDate(formatDateTimeLocal(date));
        }
      } catch {
        // If parsing fails, default to absolute mode with current time
        setMode('absolute');
        setAbsoluteDate(formatDateTimeLocal(new Date()));
      }
    } else {
      // Default to current time
      setAbsoluteDate(formatDateTimeLocal(new Date()));
    }
  }, [value]);

  // Format date for datetime-local input
  const formatDateTimeLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleModeChange = (newMode: 'absolute' | 'relative') => {
    setMode(newMode);
    if (newMode === 'absolute') {
      const date = absoluteDate || formatDateTimeLocal(new Date());
      onChange(new Date(date).toISOString());
      setAbsoluteDate(date);
    } else if (selectedOption) {
      handleRelativeOptionChange(selectedOption);
    }
  };

  const handleAbsoluteDateChange = (dateValue: string) => {
    setAbsoluteDate(dateValue);
    if (dateValue) {
      onChange(new Date(dateValue).toISOString());
    }
  };

  const handleRelativeOptionChange = (optionId: string) => {
    setSelectedOption(optionId);
    const option = relativeOptions.find(opt => opt.id === optionId);
    if (option) {
      onChange(option.getValue());
    }
  };

  const handleCustomValueChange = (type: 'days' | 'months' | 'years', value: number) => {
    if (type === 'days') {
      setCustomDays(value);
      if (selectedOption === 'custom_days') {
        const option = relativeOptions.find(opt => opt.id === 'custom_days');
        if (option) onChange(option.getValue());
      }
    } else if (type === 'months') {
      setCustomMonths(value);
      if (selectedOption === 'custom_months') {
        const option = relativeOptions.find(opt => opt.id === 'custom_months');
        if (option) onChange(option.getValue());
      }
    } else if (type === 'years') {
      setCustomYears(value);
      if (selectedOption === 'custom_years') {
        const option = relativeOptions.find(opt => opt.id === 'custom_years');
        if (option) onChange(option.getValue());
      }
    }
  };

  const getCurrentDisplayValue = (): string => {
    if (mode === 'absolute' && absoluteDate) {
      try {
        const date = new Date(absoluteDate);
        return date.toLocaleString();
      } catch {
        return 'Invalid date';
      }
    } else if (mode === 'relative' && selectedOption) {
      const option = relativeOptions.find(opt => opt.id === selectedOption);
      return option ? option.getDisplayValue() : 'Select relative date';
    }
    return placeholder;
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-custom-text dark:text-dark-text mb-1">
          {label}
        </label>
      )}
      
      <div className="space-y-3">
        {/* Mode selector */}
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => handleModeChange('absolute')}
            disabled={disabled}
            className={`px-3 py-2 text-sm rounded-md transition-colors ${
              mode === 'absolute'
                ? 'bg-custom-primary text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Specific Date
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('relative')}
            disabled={disabled}
            className={`px-3 py-2 text-sm rounded-md transition-colors ${
              mode === 'relative'
                ? 'bg-custom-primary text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Relative Date
          </button>
        </div>

        {/* Absolute date input */}
        {mode === 'absolute' && (
          <input
            type="datetime-local"
            value={absoluteDate}
            onChange={(e) => handleAbsoluteDateChange(e.target.value)}
            disabled={disabled}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-input text-custom-text dark:text-dark-text focus:ring-2 focus:ring-custom-primary focus:border-custom-primary"
          />
        )}

        {/* Relative date options */}
        {mode === 'relative' && (
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {relativeOptions.filter(opt => !opt.id.includes('custom')).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleRelativeOptionChange(option.id)}
                  disabled={disabled}
                  className={`px-3 py-2 text-sm rounded-md border transition-colors text-left ${
                    selectedOption === option.id
                      ? 'bg-custom-primary text-white border-custom-primary'
                      : 'bg-white dark:bg-dark-input border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* Custom relative options */}
            <div className="space-y-3 mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Custom Relative Dates</h4>
              
              {/* Custom days */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleRelativeOptionChange('custom_days')}
                  disabled={disabled}
                  className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                    selectedOption === 'custom_days'
                      ? 'bg-custom-primary text-white border-custom-primary'
                      : 'bg-white dark:bg-dark-input border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  In
                </button>
                <input
                  type="number"
                  min="1"
                  value={customDays}
                  onChange={(e) => handleCustomValueChange('days', parseInt(e.target.value) || 1)}
                  disabled={disabled}
                  className="w-20 px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-input text-custom-text dark:text-dark-text focus:ring-2 focus:ring-custom-primary focus:border-custom-primary"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">day{customDays !== 1 ? 's' : ''}</span>
              </div>

              {/* Custom months */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleRelativeOptionChange('custom_months')}
                  disabled={disabled}
                  className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                    selectedOption === 'custom_months'
                      ? 'bg-custom-primary text-white border-custom-primary'
                      : 'bg-white dark:bg-dark-input border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  In
                </button>
                <input
                  type="number"
                  min="1"
                  value={customMonths}
                  onChange={(e) => handleCustomValueChange('months', parseInt(e.target.value) || 1)}
                  disabled={disabled}
                  className="w-20 px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-input text-custom-text dark:text-dark-text focus:ring-2 focus:ring-custom-primary focus:border-custom-primary"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">month{customMonths !== 1 ? 's' : ''}</span>
              </div>

              {/* Custom years */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleRelativeOptionChange('custom_years')}
                  disabled={disabled}
                  className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                    selectedOption === 'custom_years'
                      ? 'bg-custom-primary text-white border-custom-primary'
                      : 'bg-white dark:bg-dark-input border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  In
                </button>
                <input
                  type="number"
                  min="1"
                  value={customYears}
                  onChange={(e) => handleCustomValueChange('years', parseInt(e.target.value) || 1)}
                  disabled={disabled}
                  className="w-20 px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-input text-custom-text dark:text-dark-text focus:ring-2 focus:ring-custom-primary focus:border-custom-primary"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">year{customYears !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        )}

        {/* Display current selection */}
        <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-md border">
          <div className="text-sm text-gray-600 dark:text-gray-400">Selected:</div>
          <div className="text-sm font-medium text-custom-text dark:text-dark-text">
            {getCurrentDisplayValue()}
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};

export default RelativeDatePicker;