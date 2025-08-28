declare module 'react-native-video-controls' {
  import * as React from 'react';
  import { ViewStyle, StyleProp } from 'react-native';
  import { OnLoadData, OnProgressData, OnSeekData } from 'react-native-video';

  export interface VideoPlayerProps {
    source: { uri: string } | number;
    paused?: boolean;
    onPlay?: () => void;
    onPause?: () => void;
    onEnd?: () => void;
    onBack?: () => void;
    onLoad?: (data: OnLoadData) => void;
    onProgress?: (data: OnProgressData) => void;
    onSeek?: (data: OnSeekData) => void;
    seekColor?: string;
    controlTimeout?: number;
    disableBack?: boolean;
    disableFullscreen?: boolean;
    disableVolume?: boolean;
    tapAnywhereToPause?: boolean;
    videoStyle?: StyleProp<ViewStyle>;
    style?: StyleProp<ViewStyle>;
    resizeMode?: 'contain' | 'cover' | 'stretch' | 'none';
  }

  export default class VideoPlayer extends React.Component<VideoPlayerProps> {}
}
