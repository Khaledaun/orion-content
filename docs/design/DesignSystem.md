# Design System for Professional SaaS Platforms

## Overview

This design system defines best practices for creating a high-end user experience in professional SaaS platforms. It focuses on a friendly, clear, and premium interface, ensuring accessibility and usability for all users.

## Colors

The color palette is designed to be neutral and modern, avoiding brand-specific colors. Here are the primary colors:

- **Primary Color**: #4A90E2 (Accessible Blue)
- **Secondary Color**: #50E3C2 (Soft Teal)
- **Accent Color**: #F5A623 (Warm Yellow)
- **Background Color**: #F5F7FA (Light Gray)
- **Text Color**: #333333 (Dark Gray)

### State Colors

- **Success**: #10B981 (Green)
- **Warning**: #F59E0B (Yellow)
- **Error**: #EF4444 (Red)
- **Info**: #3B82F6 (Blue)

### Accessibility

- Ensure there is sufficient contrast between text and background colors (minimum 4.5:1 ratio).
- Use color not as the only means of conveying information.
- All state indicators include icons alongside color coding.

## Spacing

Consistent spacing is crucial for a clean layout. Use the following guidelines:

- **XS Spacing**: 4px
- **Small Spacing**: 8px
- **Medium Spacing**: 16px
- **Large Spacing**: 24px
- **XL Spacing**: 32px

Use consistent margins and paddings to maintain visual hierarchies.

## Typography

Choose modern, sans-serif fonts for readability:

- **Primary Font**: [Inter](https://fonts.google.com/specimen/Inter)
- **Secondary Font**: [Roboto](https://fonts.google.com/specimen/Roboto)

### Font Sizes

- **Heading 1**: 32px (2rem)
- **Heading 2**: 24px (1.5rem)
- **Heading 3**: 20px (1.25rem)
- **Body Text**: 16px (1rem)
- **Small Text**: 14px (0.875rem)
- **Micro Text**: 12px (0.75rem)

### Font Weights

- **Bold**: 700
- **Semi-bold**: 600
- **Medium**: 500
- **Regular**: 400
- **Light**: 300

## Enhanced Component System

### Language Switcher

Global language selector supporting multiple languages with RTL layout support.

```typescript
<LanguageSwitcher
  variant="ghost"
  size="sm"
  showText={true}
/>
```

**Features:**

- Native language names display
- Right-to-left (RTL) layout support
- Accessible dropdown with proper ARIA labels
- Keyboard navigation support

### State Indicators

Visual status indicators for connection states and system health.

```typescript
<StateIndicator
  state="connected" // connected | error | action-required | unknown | loading
  label="Database Connection"
  size="default"
  showIcon={true}
/>
```

**States:**

- **Connected**: Green badge with check icon
- **Error**: Red badge with X icon
- **Action Required**: Yellow badge with warning icon
- **Unknown**: Gray badge with question icon
- **Loading**: Blue badge with spinning icon

### Enhanced Loading States

Comprehensive loading, error, and empty state components.

```typescript
// Loading State
<LoadingState
  message="Loading content..."
  size="default"
  fullScreen={false}
/>

// Error State
<ErrorState
  message="Something went wrong"
  error={errorObject}
  onRetry={handleRetry}
  showDetails={true}
/>

// Empty State
<EmptyState
  title="No data available"
  description="Add your first item to get started"
  action={<Button>Add Item</Button>}
  icon={<Icon />}
/>
```

### Accessibility Components

WCAG 2.1 AA compliant utility components.

```typescript
// Skip Link
<SkipLink href="#main-content">
  Skip to main content
</SkipLink>

// Live Region for screen readers
<LiveRegion level="polite">
  Status update: Operation completed
</LiveRegion>

// Visually Hidden content
<VisuallyHidden>
  Additional context for screen readers
</VisuallyHidden>
```

## Internationalization Guidelines

### Language Support

The system supports multiple languages with full RTL layout capabilities:

- **English** (default): Left-to-right layout
- **Arabic**: Right-to-left layout with proper text direction
- **Hebrew**: Right-to-left layout with proper text direction

### Implementation

All UI text should use the dictionary system:

```typescript
const dict = useDictionary();
return <h1>{dict.dashboard.title}</h1>;
```

### RTL Layout Considerations

- Text alignment reverses for RTL languages
- Icon directions may need adjustment
- Spacing and margins should be consistent
- Navigation elements should flow appropriately

## Accessibility Standards

### WCAG 2.1 AA Compliance

All components must meet WCAG 2.1 AA standards:

- **Perceivable**: Sufficient color contrast, alt text for images
- **Operable**: Keyboard navigation, no keyboard traps
- **Understandable**: Clear language, consistent navigation
- **Robust**: Valid HTML, compatible with assistive technologies

### Keyboard Navigation

- All interactive elements must be keyboard accessible
- Tab order should be logical and intuitive
- Focus indicators must be clearly visible
- Escape key should close modal dialogs

### Screen Reader Support

- Proper heading hierarchy (h1, h2, h3...)
- ARIA labels for complex components
- Live regions for dynamic content updates
- Descriptive link and button text

## Component Usage Guidelines

### Buttons

Use buttons for primary actions, links for secondary actions.

```css
.button-primary {
  background-color: #4a90e2;
  color: #ffffff;
  padding: 12px 24px;
  border-radius: 6px;
  font-family: "Inter", sans-serif;
  font-weight: 500;
  min-height: 44px; /* Touch target size */
}

.button-primary:hover {
  background-color: #357abd;
}

.button-primary:focus {
  outline: 2px solid #4a90e2;
  outline-offset: 2px;
}
```

### Cards

Information containers with consistent spacing and shadows.

```css
.card {
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 24px;
  border: 1px solid #e5e7eb;
}

.card:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s ease;
}
```

### Form Elements

Accessible form inputs with proper labels and validation.

```css
.form-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 16px;
  min-height: 44px;
}

.form-input:focus {
  outline: none;
  border-color: #4a90e2;
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #374151;
}
```

## Mobile and Responsive Design

### Breakpoints

- **Mobile**: 320px - 767px
- **Tablet**: 768px - 1023px
- **Desktop**: 1024px+

### Touch Targets

- Minimum size: 44x44 pixels
- Sufficient spacing between interactive elements
- Comfortable thumb reach zones

### Content Reflow

- Content must reflow at 320px width
- Text should remain readable when zoomed to 200%
- Horizontal scrolling should be minimal

## Performance Guidelines

### Loading Optimization

- Skeleton screens for loading states
- Progressive image loading
- Lazy loading for off-screen content
- Optimized font loading

### Animation Standards

- Respect `prefers-reduced-motion` settings
- Use easing functions for natural movement
- Keep animations under 300ms for UI feedback
- Provide loading indicators for operations >100ms

## Testing Standards

### Accessibility Testing

- Automated testing with axe-core
- Manual keyboard navigation testing
- Screen reader compatibility verification
- Color contrast validation

### Cross-browser Testing

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

### Internationalization Testing

- Text expansion/contraction testing
- RTL layout verification
- Unicode character support
- Date/time format localization

## Example Implementation

This section illustrates how to use components effectively within your applications. Ensure adherence to the guidelines outlined above for a consistent user experience across all platforms.

```typescript
// Complete page example with i18n and accessibility
export function ExamplePage() {
  const dict = useDictionary();
  const { isRTL } = useLanguage();

  return (
    <div className={isRTL ? 'rtl' : 'ltr'} dir={isRTL ? 'rtl' : 'ltr'}>
      <SkipLink href="#main-content">
        {dict.accessibility.skipToMain}
      </SkipLink>

      <header>
        <h1>{dict.page.title}</h1>
        <LanguageSwitcher showText />
      </header>

      <main id="main-content" role="main" tabIndex={-1}>
        <StateIndicator state="connected" label="System Status" />
        {/* Page content */}
      </main>
    </div>
  );
}
```

---

This design system serves as a foundation for building user interfaces that are both aesthetically pleasing and functionally robust, fostering a premium experience for users in the SaaS environment while maintaining the highest standards of accessibility and internationalization.
