import React from 'react';
import Svg, {
  Path,
  Circle,
  Line,
  Polyline,
  Rect,
  G,
} from 'react-native-svg';

const SvgIcon = ({ name, size = 24, color = '#000', strokeWidth = 2, fill = 'none', style }) => {
  const svgProps = { width: size, height: size, viewBox: '0 0 24 24', fill, stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round', style };
  const icons = {
    // Navigation and UI
    chevronDown: (
      <Svg {...svgProps}>
        <Polyline points="6 9 12 15 18 9" />
      </Svg>
    ),
    chevronUp: (
      <Svg {...svgProps}>
        <Polyline points="18 15 12 9 6 15" />
      </Svg>
    ),
    chevronLeft: (
      <Svg {...svgProps}>
        <Polyline points="15 18 9 12 15 6" />
      </Svg>
    ),
    chevronRight: (
      <Svg {...svgProps}>
        <Polyline points="9 18 15 12 9 6" />
      </Svg>
    ),
    close: (
      <Svg {...svgProps}>
        <Line x1="18" y1="6" x2="6" y2="18" />
        <Line x1="6" y1="6" x2="18" y2="18" />
      </Svg>
    ),
    menu: (
      <Svg {...svgProps}>
        <Line x1="3" y1="6" x2="21" y2="6" />
        <Line x1="3" y1="12" x2="21" y2="12" />
        <Line x1="3" y1="18" x2="21" y2="18" />
      </Svg>
    ),

    // Status icons
    checkCircle: (
      <Svg {...svgProps}>
        <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <Polyline points="22 4 12 14.01 9 11.01" />
      </Svg>
    ),
    alertCircle: (
      <Svg {...svgProps}>
        <Circle cx="12" cy="12" r="10" />
        <Line x1="12" y1="8" x2="12" y2="12" />
        <Line x1="12" y1="16" x2="12.01" y2="16" />
      </Svg>
    ),
    xCircle: (
      <Svg {...svgProps}>
        <Circle cx="12" cy="12" r="10" />
        <Line x1="15" y1="9" x2="9" y2="15" />
        <Line x1="9" y1="9" x2="15" y2="15" />
      </Svg>
    ),
    infoCircle: (
      <Svg {...svgProps}>
        <Circle cx="12" cy="12" r="10" />
        <Line x1="12" y1="16" x2="12" y2="12" />
        <Line x1="12" y1="8" x2="12.01" y2="8" />
      </Svg>
    ),

    // Form inputs
    eye: (
      <Svg {...svgProps}>
        <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <Circle cx="12" cy="12" r="3" />
      </Svg>
    ),
    eyeOff: (
      <Svg {...svgProps}>
        <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <Line x1="1" y1="1" x2="23" y2="23" />
      </Svg>
    ),

    // Action icons
    download: (
      <Svg {...svgProps}>
        <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <Polyline points="7 10 12 15 17 10" />
        <Line x1="12" y1="15" x2="12" y2="3" />
      </Svg>
    ),
    upload: (
      <Svg {...svgProps}>
        <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <Polyline points="17 8 12 3 7 8" />
        <Line x1="12" y1="3" x2="12" y2="15" />
      </Svg>
    ),
    search: (
      <Svg {...svgProps}>
        <Circle cx="11" cy="11" r="8" />
        <Line x1="21" y1="21" x2="16.65" y2="16.65" />
      </Svg>
    ),
    trash: (
      <Svg {...svgProps}>
        <Polyline points="3 6 5 6 21 6" />
        <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <Line x1="10" y1="11" x2="10" y2="17" />
        <Line x1="14" y1="11" x2="14" y2="17" />
      </Svg>
    ),
    edit: (
      <Svg {...svgProps}>
        <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </Svg>
    ),
    copy: (
      <Svg {...svgProps}>
        <Path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <Rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      </Svg>
    ),
    share: (
      <Svg {...svgProps}>
        <Circle cx="18" cy="5" r="3" />
        <Circle cx="6" cy="12" r="3" />
        <Circle cx="18" cy="19" r="3" />
        <Line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <Line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </Svg>
    ),

    // Civic specific
    mapPin: (
      <Svg {...svgProps}>
        <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <Circle cx="12" cy="10" r="3" />
      </Svg>
    ),
    users: (
      <Svg {...svgProps}>
        <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <Circle cx="9" cy="7" r="4" />
        <Path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </Svg>
    ),
    bell: (
      <Svg {...svgProps}>
        <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </Svg>
    ),
    phone: (
      <Svg {...svgProps}>
        <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
      </Svg>
    ),
  };

  return icons[name] || <Svg />;
};

export default SvgIcon;
