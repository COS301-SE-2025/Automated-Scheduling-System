import React from 'react';
import { render } from '@testing-library/react-native';
import BrandHeader from '@/components/ui/BrandHeader';

describe('BrandHeader', () => {
  it('renders title and subtitle', () => {
    const { getByText } = render(<BrandHeader title="Acme" subtitle="Scheduler" tagline="Plan smart" />);
    expect(getByText('Acme')).toBeTruthy();
    expect(getByText('Scheduler')).toBeTruthy();
    expect(getByText('Plan smart')).toBeTruthy();
  });

  it('hides tagline when not provided', () => {
    const { queryByText } = render(<BrandHeader title="Acme" subtitle="Scheduler" />);
    expect(queryByText('Plan smart')).toBeNull();
  });
});
