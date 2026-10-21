/**
 * AgriScan AI — Professional Vector Icon System
 *
 * Built with react-native-svg for crisp, pixel-perfect rendering across all
 * platforms (iOS, Android, Web). Replaces toy emojis with high-end, clean
 * line icons adhering to anti-slop visual design standards.
 */
import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle, Rect, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { colors } from './utils/theme';

// Clean 24x24 SVG definitions (strokeWidth 2, round linecap/linejoin by default)
const ICONS = {
  // Navigation & Core
  home: (c) => (
    <>
      <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Polyline points="9 22 9 12 15 12 15 22" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  history: (c) => (
    <>
      <Circle cx="12" cy="12" r="9" stroke={c} strokeWidth="2" fill="none" />
      <Polyline points="12 7 12 12 15 15" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  qr_code_scanner: (c) => (
    <>
      <Path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Line x1="4" y1="12" x2="20" y2="12" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  menu_book: (c) => (
    <>
      <Path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  settings: (c) => (
    <>
      <Circle cx="12" cy="12" r="3" stroke={c} strokeWidth="2" fill="none" />
      <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  search: (c) => (
    <>
      <Circle cx="11" cy="11" r="8" stroke={c} strokeWidth="2" fill="none" />
      <Line x1="21" y1="21" x2="16.65" y2="16.65" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  tune: (c) => (
    <>
      <Line x1="4" y1="21" x2="4" y2="14" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Line x1="4" y1="10" x2="4" y2="3" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Line x1="12" y1="21" x2="12" y2="12" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Line x1="12" y1="8" x2="12" y2="3" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Line x1="20" y1="21" x2="20" y2="16" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Line x1="20" y1="12" x2="20" y2="3" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Line x1="1" y1="14" x2="7" y2="14" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Line x1="9" y1="8" x2="15" y2="8" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Line x1="17" y1="16" x2="23" y2="16" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  swipe_left: (c) => (
    <Path d="M14 5l-7 7 7 7" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  ),

  // Arrows & Navigation
  arrow_back_ios_new: (c) => (
    <Path d="M15 18l-6-6 6-6" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  ),
  arrow_forward: (c) => (
    <>
      <Line x1="5" y1="12" x2="19" y2="12" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Polyline points="12 5 19 12 12 19" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  chevron_right: (c) => (
    <Path d="M9 18l6-6-6-6" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  ),
  expand_more: (c) => (
    <Path d="M6 9l6 6 6-6" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  ),

  // Status & Utility
  notifications: (c) => (
    <>
      <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  share: (c) => (
    <>
      <Circle cx="18" cy="5" r="3" stroke={c} strokeWidth="2" fill="none" />
      <Circle cx="6" cy="12" r="3" stroke={c} strokeWidth="2" fill="none" />
      <Circle cx="18" cy="19" r="3" stroke={c} strokeWidth="2" fill="none" />
      <Line x1="8.59" y1="13.51" x2="15.42" y2="17.49" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Line x1="15.41" y1="6.51" x2="8.59" y2="10.49" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  close: (c) => (
    <>
      <Line x1="18" y1="6" x2="6" y2="18" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Line x1="6" y1="6" x2="18" y2="18" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  cloud_done: (c) => (
    <>
      <Path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Polyline points="9 15 11 17 15 13" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  verified: (c) => (
    <>
      <Path d="M12 2l3 3 4-1 1 4 4 2-2 4 2 4-4 2-1 4-4-1-3 3-3-3-4 1-1-4-4-2 2-4-2-4 4-2 1-4 4 1z" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Polyline points="9 12 11 14 15 10" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  check_circle: (c) => (
    <>
      <Circle cx="12" cy="12" r="9" stroke={c} strokeWidth="2" fill="none" />
      <Polyline points="9 12 11 14 15 10" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  schedule: (c) => (
    <>
      <Circle cx="12" cy="12" r="9" stroke={c} strokeWidth="2" fill="none" />
      <Polyline points="12 6 12 12 16 14" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  bolt: (c) => (
    <Polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  ),
  warning: (c) => (
    <>
      <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Line x1="12" y1="9" x2="12" y2="13" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Line x1="12" y1="17" x2="12.01" y2="17" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  error: (c) => (
    <>
      <Circle cx="12" cy="12" r="9" stroke={c} strokeWidth="2" fill="none" />
      <Line x1="12" y1="8" x2="12" y2="12" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Line x1="12" y1="16" x2="12.01" y2="16" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </>
  ),

  // Nature & Agriculture
  eco: (c) => (
    <>
      <Path d="M12 2C6.5 2 2 6.5 2 12c0 3.5 1.8 6.5 4.5 8.2L12 12l5.5 8.2c2.7-1.7 4.5-4.7 4.5-8.2 0-5.5-4.5-10-10-10z" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M12 2v20" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  nature: (c) => (
    <>
      <Path d="M12 22v-8m0 0a6 6 0 1 0-6-6c0 4 3 6 6 6zm0 0a6 6 0 1 1 6-6c0 4-3 6-6 6z" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  analytics: (c) => (
    <>
      <Line x1="18" y1="20" x2="18" y2="10" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Line x1="12" y1="20" x2="12" y2="4" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Line x1="6" y1="20" x2="6" y2="14" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  document_scanner: (c) => (
    <>
      <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Polyline points="14 2 14 8 20 8" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Line x1="8" y1="13" x2="16" y2="13" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Line x1="8" y1="17" x2="12" y2="17" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  lightbulb: (c) => (
    <>
      <Path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-7 7c0 2.5 1.3 4.7 3.2 6H15.8c1.9-1.3 3.2-3.5 3.2-6a7 7 0 0 0-7-7z" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),

  // Diagnostics & Support
  biotech: (c) => (
    <>
      <Path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Polyline points="3.27 6.96 12 12.01 20.73 6.96" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Line x1="12" y1="22.08" x2="12" y2="12" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  psychology: (c) => (
    <>
      <Path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08A3 3 0 0 1 2 14a2.5 2.5 0 0 1 0-5 3 3 0 0 1 2.08-2.86A2.5 2.5 0 0 1 9.5 2z" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08A3 3 0 0 0 22 14a2.5 2.5 0 0 0 0-5 3 3 0 0 0-2.08-2.86A2.5 2.5 0 0 0 14.5 2z" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  science: (c) => (
    <>
      <Path d="M10 2v7.31L4.35 19.5A2 2 0 0 0 6.09 22h11.82a2 2 0 0 0 1.74-2.5L14 9.31V2" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Line x1="8.5" y1="2" x2="15.5" y2="2" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Line x1="7" y1="16" x2="17" y2="16" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  troubleshoot: (c) => (
    <>
      <Circle cx="12" cy="12" r="9" stroke={c} strokeWidth="2" fill="none" />
      <Circle cx="12" cy="12" r="4" stroke={c} strokeWidth="2" fill="none" />
      <Line x1="12" y1="1" x2="12" y2="5" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Line x1="12" y1="19" x2="12" y2="23" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Line x1="1" y1="12" x2="5" y2="12" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Line x1="19" y1="12" x2="23" y2="12" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  shield: (c) => (
    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  ),
  support_agent: (c) => (
    <>
      <Path d="M3 18v-6a9 9 0 0 1 18 0v6" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  call: (c) => (
    <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  ),

  // Camera & Media
  photo_library: (c) => (
    <>
      <Rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke={c} strokeWidth="2" fill="none" />
      <Circle cx="8.5" cy="8.5" r="1.5" stroke={c} strokeWidth="1.5" fill="none" />
      <Polyline points="21 15 16 10 5 21" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  photo_camera: (c) => (
    <>
      <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Circle cx="12" cy="13" r="4" stroke={c} strokeWidth="2" fill="none" />
    </>
  ),
  camera: (c) => (
    <>
      <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Circle cx="12" cy="13" r="4" stroke={c} strokeWidth="2" fill="none" />
    </>
  ),
  flip_camera_ios: (c) => (
    <>
      <Path d="M20 7h-9M11 7l4-4M11 7l4 4" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M4 17h9M13 17l-4-4M13 17l4 4" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  center_focus_strong: (c) => (
    <>
      <Circle cx="12" cy="12" r="3" stroke={c} strokeWidth="2" fill="none" />
      <Path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  flash_off: (c) => (
    <>
      <Line x1="1" y1="1" x2="23" y2="23" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Path d="M12.41 6.75L13 2l-2.43 2.92M8.53 8.53L3 14h7l-1 8 5.66-6.8" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  flash_on: (c) => (
    <Polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  ),
  grid_on: (c) => (
    <>
      <Rect x="3" y="3" width="18" height="18" rx="2" stroke={c} strokeWidth="2" fill="none" />
      <Line x1="3" y1="9" x2="21" y2="9" stroke={c} strokeWidth="1.8" />
      <Line x1="3" y1="15" x2="21" y2="15" stroke={c} strokeWidth="1.8" />
      <Line x1="9" y1="3" x2="9" y2="21" stroke={c} strokeWidth="1.8" />
      <Line x1="15" y1="3" x2="15" y2="21" stroke={c} strokeWidth="1.8" />
    </>
  ),
  zoom_in: (c) => (
    <>
      <Circle cx="11" cy="11" r="8" stroke={c} strokeWidth="2" fill="none" />
      <Line x1="21" y1="21" x2="16.65" y2="16.65" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Line x1="11" y1="8" x2="11" y2="14" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Line x1="8" y1="11" x2="14" y2="11" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  zoom_out: (c) => (
    <>
      <Circle cx="11" cy="11" r="8" stroke={c} strokeWidth="2" fill="none" />
      <Line x1="21" y1="21" x2="16.65" y2="16.65" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Line x1="8" y1="11" x2="14" y2="11" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  sync: (c) => (
    <>
      <Polyline points="23 4 23 10 17 10" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Polyline points="1 20 1 14 7 14" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  refresh: (c) => (
    <>
      <Polyline points="23 4 23 10 17 10" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  cloud_download: (c) => (
    <>
      <Path d="M8 17l4 4 4-4M12 12v9" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  bookmark_border: (c) => (
    <Path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  ),
  bookmark: (c) => (
    <Path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" fill={c} stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  ),
  auto_awesome: (c) => (
    <>
      <Path d="M12 2l2.4 5.6L20 10l-5.6 2.4L12 18l-2.4-5.6L4 10l5.6-2.4z" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M19 17l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  partly_cloudy_day: (c) => (
    <>
      <Circle cx="12" cy="7" r="3" stroke={c} strokeWidth="1.8" fill="none" />
      <Line x1="12" y1="1" x2="12" y2="2.5" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <Line x1="17" y1="3" x2="16" y2="4.2" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <Line x1="7" y1="3" x2="8" y2="4.2" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <Path d="M17.5 19H7a4 4 0 0 1-.5-7.97A5 5 0 0 1 16 9.5a4 4 0 0 1 1.5 9.5z" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  apple: (c) => (
    <>
      <Path d="M12 20.94c1.88 0 2.94-.94 4.56-.94 1.56 0 2.44.94 4.19.94 2.25 0 3.25-2.06 4.25-4.12-1.94-.94-2.25-3.69-.31-5.31-1.31-2.12-3.5-2.5-4.5-2.5-1.81 0-3.19.94-4.19.94s-2.12-.94-3.69-.94C9.5 9 6.81 10.38 5.69 13.06c-1.5 3.56.38 8.88 2.5 8.88 1.5 0 2.38-1 3.81-1z" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M12 9V5a3 3 0 0 1 3-3" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  favorites: (c) => (
    <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  ),
  apps: (c) => (
    <>
      <Rect x="3" y="3" width="7" height="7" rx="1.5" stroke={c} strokeWidth="2" fill="none" />
      <Rect x="14" y="3" width="7" height="7" rx="1.5" stroke={c} strokeWidth="2" fill="none" />
      <Rect x="14" y="14" width="7" height="7" rx="1.5" stroke={c} strokeWidth="2" fill="none" />
      <Rect x="3" y="14" width="7" height="7" rx="1.5" stroke={c} strokeWidth="2" fill="none" />
    </>
  ),
  send: (c) => (
    <>
      <Line x1="22" y1="2" x2="11" y2="13" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M22 2l-5 9 7 4 0-13a1 1 0 0 0-1-1z" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  bug: (c) => (
    <>
      <Path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" stroke={c} strokeWidth="2" fill="none" />
      <Path d="M12 2a4 4 0 0 0-4 4v2c0 2-2 3-2 5s2 3 2 5v3a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-3s2-2 2-5-2-3-2-5V6a4 4 0 0 0-4-4z" stroke={c} strokeWidth="2" fill="none" />
      <Line x1="8" y1="2" x2="8" y2="6" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Line x1="16" y1="2" x2="16" y2="6" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Line x1="6" y1="10" x2="2" y2="10" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Line x1="18" y1="10" x2="22" y2="10" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  google: (c) => (
    <>
      <Circle cx="12" cy="12" r="10" fill="#4285F4" />
      <SvgText
        x="12.5"
        y="16.5"
        textAnchor="middle"
        fill="#ffffff"
        fontSize="12"
        fontWeight="bold"
        fontFamily="PlusJakartaSans-SemiBold"
      >
        G
      </SvgText>
    </>
  ),
};

// Simple polygon component helper for bolt / flash
function Polygon({ points, stroke, strokeWidth, strokeLinecap, strokeLinejoin, fill }) {
  const pts = points.split(' ').map(p => p.split(',').map(Number));
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]} ${p[1]}`).join(' ') + 'Z';
  return (
    <Path
      d={d}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap={strokeLinecap}
      strokeLinejoin={strokeLinejoin}
      fill={fill}
    />
  );
}

const Icon = ({ name, size = 18, color, style }) => {
  const iconColor = color || colors['on-surface'];
  const renderFn = ICONS[name];

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        {renderFn ? (
          renderFn(iconColor)
        ) : (
          <Circle cx="12" cy="12" r="6" stroke={iconColor} strokeWidth="2" fill="none" />
        )}
      </Svg>
    </View>
  );
};

export default Icon;
