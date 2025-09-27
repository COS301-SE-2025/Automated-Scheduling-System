import React from 'react';
import { render } from '@testing-library/react-native';
import MessageBox from '@/components/ui/MessageBox';

describe('MessageBox', () => {
  it('renders info variant by default', () => {
    const { getByText } = render(<MessageBox title="Info" />);
    expect(getByText('Info')).toBeTruthy();
  });

  it('renders error variant', () => {
    const { getByText } = render(<MessageBox type="error" title="Error" />);
    expect(getByText('Error')).toBeTruthy();
  });

  it('renders children text', () => {
    const { getByText } = render(<MessageBox title="Success" type="success">All good</MessageBox>);
    expect(getByText('All good')).toBeTruthy();
  });
});
