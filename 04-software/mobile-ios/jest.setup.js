/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Native modules the screens touch. Each mock is deliberately thin — enough for
 * a render pass, not a behavioural fake.
 */

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({ play: jest.fn(), remove: jest.fn() })),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-file-system', () => ({
  File: class {
    exists = false;
    uri = 'file:///tmp/x';
    create() {}
    write() {}
    delete() {}
  },
  Paths: { cache: '/tmp', document: '/tmp' },
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(false)),
  shareAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-keep-awake', () => ({ useKeepAwake: jest.fn() }));

jest.mock('expo-screen-orientation', () => ({
  lockAsync: jest.fn(() => Promise.resolve()),
  OrientationLock: { PORTRAIT_UP: 1 },
}));

jest.mock('expo-system-ui', () => ({
  setBackgroundColorAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-font', () => ({
  useFonts: () => [true, null],
  isLoaded: () => true,
  loadAsync: jest.fn(() => Promise.resolve()),
}));

/**
 * Skia renders on the GPU and has no test renderer. Every export the charts use
 * is replaced with a plain view or an inert object, so a chart still exercises
 * all of its own maths and prop wiring during the render pass.
 */
jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  const { View } = require('react-native');
  const stubPath = {
    moveTo() {},
    lineTo() {},
    close() {},
    addArc() {},
    addRect() {},
  };
  const El = (name) => (props) => React.createElement(View, props, props.children);
  return {
    Canvas: El('Canvas'),
    Group: El('Group'),
    Path: El('Path'),
    Line: El('Line'),
    Circle: El('Circle'),
    Image: El('Image'),
    vec: (x, y) => ({ x, y }),
    ColorType: { RGBA_8888: 4 },
    AlphaType: { Opaque: 1 },
    Skia: {
      Path: { Make: () => stubPath },
      XYWHRect: (x, y, w, h) => ({ x, y, width: w, height: h }),
      Data: { fromBytes: (b) => b },
      Image: { MakeImage: () => ({}) },
    },
  };
});

// Silence the reanimated strict-mode chatter; it is not what these tests check.
jest.mock('react-native-reanimated', () => ({
  runOnJS: (fn) => fn,
  default: {},
}));
