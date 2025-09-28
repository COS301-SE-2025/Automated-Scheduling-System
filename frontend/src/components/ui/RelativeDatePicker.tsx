import React, { useState } from 'react';

interface RelativeDatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

const RelativeDatePicker: React.FC<RelativeDatePickerProps> = ({
  value,
  onChange,
  className = "",
  disabled = false,
}) => {
  // Determine if current value is a specific date (YYYY-MM-DD format) or datetime (YYYY-MM-DD HH:MM) or relative
  const isSpecificDate = value && (/^\d{4}-\d{2}-\d{2}$/.test(value) || /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value));
  const isRelativeWithTime = value && /^(today|tomorrow|in \d+ (day|days|week|weeks|month|months|year|years)) \d{2}:\d{2}$/.test(value);
  const [mode, setMode] = useState<'relative' | 'specific'>(isSpecificDate ? 'specific' : 'relative');
  
  // Parse datetime value for specific mode
  const getDatePart = (dateTimeValue: string) => {
    if (!dateTimeValue) return '';
    return dateTimeValue.split(' ')[0] || '';
  };
  
  const getTimePart = (dateTimeValue: string) => {
    if (!dateTimeValue) return '';
    const parts = dateTimeValue.split(' ');
    const timePart = parts[parts.length - 1]; // Get last part which should be time
    return /^\d{2}:\d{2}$/.test(timePart) ? timePart : '09:00'; // Default to 9 AM
  };

  const getRelativePart = (dateTimeValue: string) => {
    if (!dateTimeValue) return '';
    const timeRegex = / \d{2}:\d{2}$/;
    return dateTimeValue.replace(timeRegex, ''); // Remove time part to get relative date
  };

  const relativeOptions = [
    { value: 'today', label: 'Today' },
    { value: 'tomorrow', label: 'Tomorrow' },
    { value: 'in 1 day', label: 'In 1 day' },
    { value: 'in 2 days', label: 'In 2 days' },
    { value: 'in 3 days', label: 'In 3 days' },
    { value: 'in 1 week', label: 'In 1 week' },
    { value: 'in 2 weeks', label: 'In 2 weeks' },
    { value: 'in 1 month', label: 'In 1 month' },
    { value: 'in 2 months', label: 'In 2 months' },
    { value: 'in 3 months', label: 'In 3 months' },
    { value: 'in 6 months', label: 'In 6 months' },
    { value: 'in 1 year', label: 'In 1 year' },
  ];

  const handleModeChange = (newMode: 'relative' | 'specific') => {
    setMode(newMode);
    // Clear the value when switching modes
    onChange('');
  };

  const handleRelativeChange = (newRelative: string) => {
    if (!newRelative) {
      onChange('');
      return;
    }
    const currentTime = getTimePart(value || '');
    onChange(`${newRelative} ${currentTime}`);
  };

  const handleRelativeTimeChange = (newTime: string) => {
    const currentRelative = getRelativePart(value || '');
    if (!currentRelative) return;
    onChange(`${currentRelative} ${newTime}`);
  };

  const handleDateChange = (newDate: string) => {
    if (!newDate) {
      onChange('');
      return;
    }
    const currentTime = getTimePart(value || '');
    onChange(`${newDate} ${currentTime}`);
  };

  const handleTimeChange = (newTime: string) => {
    const currentDate = getDatePart(value || '');
    if (!currentDate) return;
    onChange(`${currentDate} ${newTime}`);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Mode Selection */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleModeChange('relative')}
          disabled={disabled}
          className={`px-3 py-2 text-sm font-semibold rounded-md shadow-sm ring-1 ring-inset transition-all duration-200 ${
            mode === 'relative'
              ? 'bg-custom-secondary text-white ring-custom-secondary hover:bg-custom-third focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-custom-secondary'
              : 'bg-white dark:bg-dark-input text-custom-primary dark:text-dark-primary ring-gray-300 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-dark-div focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-300'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          Relative
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('specific')}
          disabled={disabled}
          className={`px-3 py-2 text-sm font-semibold rounded-md shadow-sm ring-1 ring-inset transition-all duration-200 ${
            mode === 'specific'
              ? 'bg-custom-secondary text-white ring-custom-secondary hover:bg-custom-third focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-custom-secondary'
              : 'bg-white dark:bg-dark-input text-custom-primary dark:text-dark-primary ring-gray-300 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-dark-div focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-300'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          Specific Date
        </button>
      </div>

      {/* Date Input */}
      {mode === 'relative' ? (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-custom-text dark:text-dark-text mb-1">
              Relative Date
            </label>
            <select
              value={getRelativePart(value || '')}
              onChange={(e) => handleRelativeChange(e.target.value)}
              disabled={disabled}
              className="block w-full rounded-md border-0 py-2 px-3 text-custom-text dark:text-dark-text bg-custom-background dark:bg-dark-input placeholder:text-custom-placeholder dark:placeholder-dark-placeholder shadow-sm ring-1 ring-inset ring-custom-border dark:ring-dark-border focus:ring-2 focus:ring-inset focus:ring-custom-primary dark:focus:ring-dark-primary sm:text-sm sm:leading-6"
            >
              <option value="">Select relative date...</option>
              {relativeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-custom-text dark:text-dark-text mb-1">
              Start Time
            </label>
            <input
              type="time"
              value={getTimePart(value || '')}
              onChange={(e) => handleRelativeTimeChange(e.target.value)}
              disabled={disabled || !getRelativePart(value || '')}
              className="block w-full rounded-md border-0 py-2 px-3 text-custom-text dark:text-dark-text bg-custom-background dark:bg-dark-input placeholder:text-custom-placeholder dark:placeholder-dark-placeholder shadow-sm ring-1 ring-inset ring-custom-border dark:ring-dark-border focus:ring-2 focus:ring-inset focus:ring-custom-primary dark:focus:ring-dark-primary sm:text-sm sm:leading-6"
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-custom-text dark:text-dark-text mb-1">
              Date
            </label>
            <input
              type="date"
              value={getDatePart(value || '')}
              onChange={(e) => handleDateChange(e.target.value)}
              disabled={disabled}
              className="block w-full rounded-md border-0 py-2 px-3 text-custom-text dark:text-dark-text bg-custom-background dark:bg-dark-input placeholder:text-custom-placeholder dark:placeholder-dark-placeholder shadow-sm ring-1 ring-inset ring-custom-border dark:ring-dark-border focus:ring-2 focus:ring-inset focus:ring-custom-primary dark:focus:ring-dark-primary sm:text-sm sm:leading-6"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-custom-text dark:text-dark-text mb-1">
              Start Time
            </label>
            <input
              type="time"
              value={getTimePart(value || '')}
              onChange={(e) => handleTimeChange(e.target.value)}
              disabled={disabled || !getDatePart(value || '')}
              className="block w-full rounded-md border-0 py-2 px-3 text-custom-text dark:text-dark-text bg-custom-background dark:bg-dark-input placeholder:text-custom-placeholder dark:placeholder-dark-placeholder shadow-sm ring-1 ring-inset ring-custom-border dark:ring-dark-border focus:ring-2 focus:ring-inset focus:ring-custom-primary dark:focus:ring-dark-primary sm:text-sm sm:leading-6"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default RelativeDatePicker;
