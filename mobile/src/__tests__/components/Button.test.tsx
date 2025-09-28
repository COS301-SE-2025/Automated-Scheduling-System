import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Button from '@/components/ui/Button';

describe('Button', () => {
  it('renders title', () => {
    const { getByText } = render(<Button title="Click" />);
    expect(getByText('Click')).toBeTruthy();
  });

  it('fires onPress', () => {
    const fn = jest.fn();
    const { getByRole } = render(<Button title="Tap" onPress={fn} />);
    fireEvent.press(getByRole('button'));
    expect(fn).toHaveBeenCalled();
  });

  it('shows loader when loading', () => {
    const { queryByText, getByRole } = render(<Button title="Load" loading />);
    expect(queryByText('Load')).toBeNull();
    expect(getByRole('button')).toBeTruthy();
  });
});
