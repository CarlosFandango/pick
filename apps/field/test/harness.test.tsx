import { render, screen } from '@testing-library/react';
import { Text, View } from 'react-native';
import { describe, expect, it } from 'vitest';

describe('the native test harness', () => {
  it('renders React Native primitives to a DOM we can assert on', () => {
    render(
      <View>
        <Text>PICKsel</Text>
      </View>,
    );
    expect(screen.getByText('PICKsel')).toBeInTheDocument();
  });
});
