import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TextField from '@/components/ui/TextField';

describe('TextField', () => {
  it('renders label and updates value', () => {
    const onChange = jest.fn();
    const { getByText, getByDisplayValue, rerender } = render(
      <TextField label="Username" value="" onChangeText={onChange} />
    );
    expect(getByText('Username')).toBeTruthy();
    // Simulate user typing
    fireEvent.changeText(getByDisplayValue(''), 'john');
    expect(onChange).toHaveBeenCalledWith('john');

    rerender(<TextField label="Username" value="john" onChangeText={onChange} />);
    expect(getByDisplayValue('john')).toBeTruthy();
  });

  it('shows error message', () => {
    const { getByText } = render(
      <TextField label="Email" value="" error="Required" />
    );
    expect(getByText('Required')).toBeTruthy();
  });
});
