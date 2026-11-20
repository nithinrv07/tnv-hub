# TNV Civic Design System - Component Library (Section A)

This directory contains the Phase 2 shared component library for the Tamil Nadu Volunteers (TNV) Hub.
It provides zero-dependency, mobile-first, accessible (WCAG 2.1 AA) primitives built on Tailwind CSS and native React.

---

## Component Catalog & Usage Snippets

### 1. `Icon` (`icons.jsx`)
Zero-dependency inline SVG vector icon set with standard 24×24 `viewBox`. Decorative by default (`aria-hidden="true"`) unless a `label` prop is provided.
```jsx
import { Icon } from '../components/ui';

// Decorative
<Icon name="calendar" className="h-5 w-5 text-brand-green" />

// Accessible (role="img" with aria-label)
<Icon name="alert" label="Warning: Overdue SLA" className="h-5 w-5 text-task-overdue" />
```
Available icons: `menu`, `close`, `search`, `calendar`, `clock`, `user`, `users`, `building`, `folder`, `file`, `upload`, `camera`, `download`, `print`, `bell`, `check`, `alert`, `chevron-down`, `chevron-right`, `filter`, `plus`, `edit`, `trash`.

---

### 2. `Button` (`Button.jsx`)
Accessible action button built on existing TNV `.btn` classes. Guaranteed 44px touch targets (`min-h-tap`).
```jsx
import { Button, Icon } from '../components/ui';

<Button
  variant="primary" // 'primary' | 'outline' | 'ghost' | 'danger'
  size="md"         // 'md' | 'lg'
  icon={<Icon name="plus" className="h-4 w-4" />}
  loading={false}
  disabled={false}
  onClick={() => {}}
>
  Create Task
</Button>
```

---

### 3. `StatCard` (`StatCard.jsx`)
Quantitative KPI metric card. Complies with WCAG 2.1 AA by auto-pairing tone colors with icons for `warn` and `danger`.
```jsx
import { StatCard, Icon } from '../components/ui';

<StatCard
  label="Completed Relief Drives"
  value="1,420"
  hint="+12% from last month"
  tone="good" // 'neutral' | 'good' | 'warn' | 'danger'
  icon={<Icon name="check" className="h-5 w-5" />}
  href="/tasks/completed"
/>
```

---

### 4. `StatusBadge` (`StatusBadge.jsx`)
Status pill badge pairing high-contrast semantic tokens with icons.
```jsx
import { StatusBadge } from '../components/ui';

<StatusBadge status="in-progress" />
```
Supported status values:
- `not-started`: Not Started (gray tint)
- `in-progress`: In Progress (blue tint)
- `submitted-review`: Submitted for Review (purple tint)
- `completed`: Completed (green tint)
- `rework`: Rejected / Rework Required (amber tint)
- `overdue`: Overdue (red tint)

---

### 5. `DataTable` (`DataTable.jsx`)
Hybrid responsive table primitive:
- **Desktop (&ge;768px)**: Real semantic `<table>` inside `overflow-x-auto` wrapper with sticky header.
- **Mobile (&lt;768px)**: Transforms each row into a stacked card with primary column header, key-value rows, and bottom actions. Zero horizontal scrolling at 360px.
```jsx
import { DataTable, StatusBadge } from '../components/ui';

const columns = [
  { key: 'id', header: 'ID', mobileLabel: 'ID' },
  { key: 'title', header: 'Task Title', primary: true, mobileLabel: 'Task' },
  { key: 'dept', header: 'Department', mobileLabel: 'Dept' },
  {
    key: 'status',
    header: 'Status',
    render: val => <StatusBadge status={val} />
  }
];

<DataTable
  columns={columns}
  rows={taskRows}
  rowKey="id"
  loading={false}
  onRowClick={row => handleOpen(row)}
/>
```

---

### 6. `Drawer` (`Drawer.jsx`)
Slide-over right panel on desktop (&ge;768px) and responsive bottom sheet on mobile (&lt;768px). Includes focus trap, body scroll lock, backdrop click, Escape key listener, and focus restoration to trigger element.
```jsx
import { Drawer, Button } from '../components/ui';

<Drawer
  open={isOpen}
  onClose={() => setIsOpen(false)}
  title="Task Details"
  footer={
    <Button variant="primary" onClick={() => setIsOpen(false)}>
      Close
    </Button>
  }
>
  <p>Drawer content goes here</p>
</Drawer>
```

---

### 7. `Tabs` (`Tabs.jsx`)
Accessible tab navigation with `role="tablist"` and keyboard arrow navigation (`Left`/`Right`/`Home`/`End`). Horizontal swipe on mobile with `.no-scrollbar`.
```jsx
import { Tabs } from '../components/ui';

<Tabs
  tabs={[
    { id: 'all', label: 'All Tasks', count: 12 },
    { id: 'pending', label: 'Pending', count: 4 }
  ]}
  activeId={activeTab}
  onChange={setActiveTab}
/>
```

---

### 8. `FileUpload` (`FileUpload.jsx`)
Accessible file uploader with two distinct buttons: "Take photo" (camera capture) and "Choose file" (picker). Client-side validation for file size and file types. Generates instant preview thumbnails via `compressImage` from `lib/image.js`.
```jsx
import { FileUpload } from '../components/ui';

<FileUpload
  label="Upload Field Report Photos"
  accept="image/*,.pdf"
  maxSizeMB={5}
  multiple={true}
  onChange={files => handleFiles(files)}
/>
```

---

### 9. `PageHeader` (`PageHeader.jsx`)
Standard header for internal dashboards and workbenches with breadcrumb trail and responsive actions.
```jsx
import { PageHeader, Button } from '../components/ui';

<PageHeader
  title="Disaster Logistics"
  subtitle="District relief hub allocation"
  breadcrumbs={[
    { label: 'Operations', to: '/ops' },
    { label: 'Disaster Relief' }
  ]}
  actions={<Button variant="primary">New Dispatch</Button>}
/>
```

---

### 10. `EmptyState` (`EmptyState.jsx`)
Informative empty state with centered icon, heading, message, and call-to-action button.
```jsx
import { EmptyState, Button } from '../components/ui';

<EmptyState
  title="No Dispatches Found"
  message="There are currently no active relief dispatches in this district."
  action={<Button variant="primary">Create Dispatch</Button>}
/>
```

---

### 11. `FormSection` (`FormSection.jsx`)
Responsive fieldset container: 1 column on mobile (<768px) and 2 columns from desktop (&ge;768px). Works directly with `form/FormField.jsx`.
```jsx
import { FormSection } from '../components/ui';
import FormField, { inputClass } from '../form/FormField.jsx';

<FormSection title="Coordinator Information" description="Contact details for field staff">
  <FormField id="name" label="Full Name">
    {props => <input className={inputClass(false)} {...props} />}
  </FormField>
  <FormField id="phone" label="Phone Number">
    {props => <input className={inputClass(false)} {...props} />}
  </FormField>
</FormSection>
```

---

### 12. `PortalShell` (`client/src/components/portal/PortalShell.jsx`)
Responsive internal layout shell with conditional role-based navigation filtering, desktop fixed sidebar, mobile slide-over drawer, and skip-to-content anchor.
```jsx
import PortalShell from '../components/portal/PortalShell.jsx';
import { getCurrentUser, logout } from '../../lib/authService.js';

const user = getCurrentUser();
const role = user?.role || 'volunteer';

<PortalShell
  navItems={[
    { label: 'Overview', to: '/tasks' },
    { label: 'Reports', to: '/reports', roles: ['master_admin', 'dept_admin'] }
  ]}
  role={role}
  user={user}
  onLogout={logout}
>
  <Outlet />
</PortalShell>
```

---

## Architectural Rules

1. **Use Established Primitives**: Future Phase 2 screens must consume these components rather than writing custom one-off markup.
2. **Never Hardcode Hex Colors**: Use Tailwind token classes (`bg-brand-green`, `text-task-overdue`, etc.).
3. **44px Minimum Touch Targets**: Ensure buttons, dropdowns, and interactive items satisfy `min-h-tap` and `min-w-tap`.
4. **Never Rely on Color Alone**: Warning and error states must always pair color with text or an icon.
5. **Bilingual Safety**: Avoid fixed widths on text containers. Tamil text requires flexible wrapping and breathing room.
