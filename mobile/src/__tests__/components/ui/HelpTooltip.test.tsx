import React from 'react';
import { render } from '@testing-library/react-native';
import HelpTooltip from '@/components/ui/HelpTooltip';

describe('HelpTooltip', () => {
  it('renders help text', () => {
    const { getByText } = render(<HelpTooltip text="Helpful tip" />);
    expect(getByText('Helpful tip')).toBeTruthy();
  });
});
