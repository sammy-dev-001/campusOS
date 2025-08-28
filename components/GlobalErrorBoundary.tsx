import React from 'react';
import { View, Text } from 'react-native';

export interface GlobalErrorBoundaryProps {
  children?: React.ReactNode;
}

export default class GlobalErrorBoundary extends React.Component<GlobalErrorBoundaryProps, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    console.error('GlobalErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
          <Text style={{ color: 'red', fontWeight: 'bold', fontSize: 18 }}>A rendering error occurred:</Text>
          <Text selectable style={{ color: 'red', marginTop: 10 }}>{String(this.state.error)}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}
