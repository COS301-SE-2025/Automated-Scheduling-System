import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import DetailModal from '@/components/ui/DetailModal';

describe('DetailModal', () => {
  it('renders sheet modal content when visible', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <DetailModal visible title="Details" onClose={onClose}>
        <></>
      </DetailModal>
    );
    expect(getByText('Details')).toBeTruthy();
  });

  it('calls onClose when pressing Close (sheet)', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <DetailModal visible title="Details" onClose={onClose}>
        <></>
      </DetailModal>
    );
    fireEvent.press(getByText('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders fullscreen variant', () => {
    const { getByText } = render(
      <DetailModal visible title="Full" onClose={() => {}} presentation="fullscreen">
        <></>
      </DetailModal>
    );
    expect(getByText('Full')).toBeTruthy();
  });
});
