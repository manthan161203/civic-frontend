# Civic SVG Icon System Guide

A comprehensive, reusable SVG icon library for consistent iconography across web and mobile applications.

## Files
- `SvgIcon.jsx` - Web/React component
- `../../../mobile/src/components/SvgIcon.jsx` - Mobile/React Native component

## Installation

### Web (React/Next.js)
```jsx
import SvgIcon from '@/components/ui/SvgIcon';

<SvgIcon name="search" size={24} color="#2563eb" />
```

### Mobile (React Native)
```jsx
import SvgIcon from '../components/SvgIcon';

<SvgIcon name="search" size={24} color="#2563eb" />
```

## Available Icons

### Navigation and UI Icons
- `chevronDown` - Downward chevron arrow
- `chevronUp` - Upward chevron arrow
- `chevronLeft` - Left chevron arrow
- `chevronRight` - Right chevron arrow
- `close` - X icon for closing
- `menu` - Hamburger menu icon

### Status Icons
- `checkCircle` - Green check in circle (success)
- `alertCircle` - Warning alert icon
- `xCircle` - Error/failure icon
- `infoCircle` - Information icon

### Form Input Icons
- `eye` - Show password
- `eyeOff` - Hide password

### Action Icons
- `download` - Download file
- `upload` - Upload file
- `search` - Search/magnifying glass
- `trash` - Delete/trash icon
- `edit` - Edit/pencil icon
- `copy` - Copy/duplicate icon
- `share` - Share icon

### Civic-Specific Icons
- `buildingFill` - Building icon (filled)
- `mapPin` - Location/map pin
- `users` - Multiple users/people
- `bell` - Notification bell
- `phone` - Phone icon

## Props

### Web Component Props
```jsx
<SvgIcon
  name="search"              // Icon name (required)
  size={24}                  // Icon size in px (default: 24)
  color="currentColor"       // SVG stroke/fill color (default: currentColor)
  strokeWidth={2}            // Stroke width (default: 2)
  {...otherProps}            // Any other SVG attributes
/>
```

### Mobile Component Props
```jsx
<SvgIcon
  name="search"              // Icon name (required)
  size={24}                  // Icon size (default: 24)
  color="#000"               // Stroke color (default: #000)
  strokeWidth={2}            // Stroke width (default: 2)
  fill="none"                // Fill color (default: none)
  {...otherProps}            // Any other SVG attributes
/>
```

## Usage Examples

### Web Examples

#### Basic Icon
```jsx
import SvgIcon from '@/components/ui/SvgIcon';

export function SearchBar() {
  return (
    <div className="flex items-center gap-2">
      <SvgIcon name="search" size={20} color="#6b7280" />
      <input type="text" placeholder="Search..." />
    </div>
  );
}
```

#### Colored Status Icons
```jsx
function StatusIndicator({ status }) {
  const iconConfig = {
    success: { name: 'checkCircle', color: '#16a34a' },
    error: { name: 'xCircle', color: '#dc2626' },
    warning: { name: 'alertCircle', color: '#ea580c' },
    info: { name: 'infoCircle', color: '#2563eb' },
  };

  const config = iconConfig[status];
  return <SvgIcon name={config.name} size={24} color={config.color} />;
}
```

#### Icon Button
```jsx
function IconButton({ icon, onClick, variant = 'default' }) {
  const colorMap = {
    default: '#6b7280',
    primary: '#2563eb',
    danger: '#dc2626',
  };

  return (
    <button
      onClick={onClick}
      className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
    >
      <SvgIcon name={icon} size={20} color={colorMap[variant]} />
    </button>
  );
}
```

#### Dark Mode Support
```jsx
function SearchIcon({ darkMode }) {
  return (
    <SvgIcon
      name="search"
      size={20}
      color={darkMode ? '#e2e8f0' : '#374151'}
    />
  );
}
```

### Mobile Examples

#### Basic Icon
```jsx
import { View, Text } from 'react-native';
import SvgIcon from '../components/SvgIcon';

export function SearchBar() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <SvgIcon name="search" size={20} color="#6b7280" />
      <TextInput placeholder="Search..." />
    </View>
  );
}
```

#### Icon with Label
```jsx
function NavItem({ icon, label, active }) {
  return (
    <TouchableOpacity>
      <View style={{ alignItems: 'center', gap: 4 }}>
        <SvgIcon
          name={icon}
          size={24}
          color={active ? '#2563eb' : '#9ca3af'}
        />
        <Text style={{ fontSize: 12, color: active ? '#2563eb' : '#9ca3af' }}>
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
```

#### Status Display
```jsx
function IssueStatus({ status }) {
  const statusConfig = {
    resolved: { icon: 'checkCircle', color: '#16a34a' },
    open: { icon: 'alertCircle', color: '#ea580c' },
    rejected: { icon: 'xCircle', color: '#dc2626' },
  };

  const config = statusConfig[status];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <SvgIcon name={config.icon} size={20} color={config.color} />
      <Text>{status}</Text>
    </View>
  );
}
```

## Design Guidelines

### Size Standards
- Small UI elements: `16px` or `size={16}`
- Navigation items: `20-24px`
- Large icons/badges: `32-48px`
- Hero/featured icons: `64px+`

### Color Standards
- Primary actions: `#2563eb` (blue)
- Success/completed: `#16a34a` (green)
- Warning/caution: `#ea580c` (orange)
- Error/danger: `#dc2626` (red)
- Neutral/secondary: `#6b7280` (gray)
- Light text: `#e2e8f0` (slate-100)

### Stroke Width
- Standard UI icons: `2` (default)
- Small icons (< 20px): `2`
- Large icons (> 40px): `1.5-2`

## Adding New Icons

To add new icons to the library:

1. Open `SvgIcon.jsx` (web) or `SvgIcon.jsx` (mobile)
2. Add to the `icons` object with a descriptive name
3. Use a clean SVG path (viewBox 0 0 24 24 recommended)
4. Use `stroke` and `strokeLinecap="round"` for line icons
5. Use `fill` for solid icons

### Web Example
```jsx
const icons = {
  // ... existing icons
  download: (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="7 10 12 15 17 10"></polyline>
      <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
  ),
};
```

### Mobile Example
```jsx
const icons = {
  // ... existing icons
  download: (
    <Svg viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <Polyline points="7 10 12 15 17 10" />
      <Line x1="12" y1="15" x2="12" y2="3" />
    </Svg>
  ),
};
```

## Best Practices

1. Always use descriptive icon names
2. Keep SVG paths clean and simple
3. Use `currentColor` in web for color inheritance
4. Maintain consistent stroke widths
5. Use rounded line caps (`strokeLinecap="round"`)
6. Test icons at multiple sizes (16, 20, 24, 32, 48)
7. Ensure icons work in both light and dark modes
8. Document custom icons in the guide

## Accessibility

Icons should always be accompanied by:
- Text labels when possible
- `aria-label` attributes on web
- Sufficient contrast ratio (WCAG AA: 4.5:1)
- Clear meaning without text context

### Example
```jsx
<button aria-label="Search" className="p-2">
  <SvgIcon name="search" size={20} color="#6b7280" />
</button>
```
