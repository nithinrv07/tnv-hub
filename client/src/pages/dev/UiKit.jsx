/**
 * Developer Reference: Phase 2 Global Design System UI Kit (/dev/ui-kit)
 *
 * This preview workbench showcases all Section A components, responsive patterns,
 * WCAG 2.1 AA accessibility features, and role-based portal layout mechanics.
 * It is additive and isolated from production routes.
 */

import { useState } from 'react';
import PortalShell from '../../components/portal/PortalShell.jsx';
import FormField, { inputClass } from '../../components/form/FormField.jsx';
import {
  Icon,
  Button,
  StatCard,
  StatusBadge,
  DataTable,
  Drawer,
  Tabs,
  FileUpload,
  PageHeader,
  EmptyState,
  FormSection
} from '../../components/ui/index.js';

// Sample navigation items with role-based visibility restrictions
const PORTAL_NAV_ITEMS = [
  { label: 'Overview', to: '/dev/ui-kit', icon: <Icon name="building" /> },
  { label: 'Members', to: '/dev/ui-kit#members', icon: <Icon name="users" />, roles: ['master_admin', 'dept_admin'] },
  { label: 'Departments', to: '/dev/ui-kit#departments', icon: <Icon name="building" />, roles: ['master_admin'] },
  { label: 'Tasks', to: '/dev/ui-kit#tasks', icon: <Icon name="check" /> },
  { label: 'Reports', to: '/dev/ui-kit#reports', icon: <Icon name="file" />, roles: ['master_admin', 'dept_admin'] },
  { label: 'Projects', to: '/dev/ui-kit#projects', icon: <Icon name="folder" /> },
  { label: 'Documents', to: '/dev/ui-kit#documents', icon: <Icon name="upload" />, roles: ['master_admin', 'dept_admin', 'volunteer'] }
];

// 6 Realistic Tamil Nadu Volunteer Task Rows
const SAMPLE_TASKS = [
  {
    id: 'TNV-T-101',
    name: 'Palm Tree Seed Planting & Coastal Green Wall Drive',
    department: 'Environment & Climate',
    assignee: 'Anitha Ramesh (Chennai)',
    dueDate: '2026-11-28',
    status: 'in-progress'
  },
  {
    id: 'TNV-T-102',
    name: 'Flood Relief Emergency Kit Logistics Audit',
    department: 'Disaster Relief Ops',
    assignee: 'K. Murugan (Cuddalore)',
    dueDate: '2026-11-22',
    status: 'submitted-review'
  },
  {
    id: 'TNV-T-103',
    name: 'Volunteer Aadhaar Masking & KYC Verification Queue',
    department: 'Membership & Verification',
    assignee: 'P. Selvam (Madurai)',
    dueDate: '2026-11-18',
    status: 'overdue'
  },
  {
    id: 'TNV-T-104',
    name: 'District Medical Camp Supply Procurement Review',
    department: 'Public Health',
    assignee: 'Dr. V. Kavitha (Tirunelveli)',
    dueDate: '2026-11-20',
    status: 'rework'
  },
  {
    id: 'TNV-T-105',
    name: 'Youth Leadership & First Responder Training',
    department: 'Volunteer Capacity',
    assignee: 'S. Rajesh (Coimbatore)',
    dueDate: '2026-12-05',
    status: 'not-started'
  },
  {
    id: 'TNV-T-106',
    name: 'TNV Annual Compliance & Financial Statement',
    department: 'Finance & Compliance',
    assignee: 'C. Meenakshi (Trichy)',
    dueDate: '2026-11-15',
    status: 'completed'
  }
];

const ICONS_LIST = [
  'menu', 'close', 'search', 'calendar', 'clock', 'user', 'users',
  'building', 'folder', 'file', 'upload', 'camera', 'download', 'print',
  'bell', 'check', 'alert', 'chevron-down', 'chevron-right', 'filter',
  'plus', 'edit', 'trash'
];

export default function UiKit() {
  // Role switcher state to test conditional Portal navigation
  const [currentRole, setCurrentRole] = useState('master_admin');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('weekly');
  const [tableLoading, setTableLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  // Table columns definition
  const tableColumns = [
    { key: 'id', header: 'Task ID', mobileLabel: 'ID' },
    { key: 'name', header: 'Task Name', primary: true, mobileLabel: 'Task' },
    { key: 'department', header: 'Department', mobileLabel: 'Dept' },
    { key: 'assignee', header: 'Assigned Person', mobileLabel: 'Assignee' },
    { key: 'dueDate', header: 'Due Date', mobileLabel: 'Due' },
    {
      key: 'status',
      header: 'Status',
      mobileLabel: 'Status',
      render: status => <StatusBadge status={status} />
    },
    {
      key: 'action',
      header: 'Action',
      align: 'right',
      render: (_, row) => (
        <Button
          variant="outline"
          size="md"
          className="!min-h-[36px] !px-3 !py-1 text-xs"
          onClick={() => {
            setSelectedTask(row);
            setDrawerOpen(true);
          }}
        >
          View details
        </Button>
      )
    }
  ];

  return (
    <PortalShell
      navItems={PORTAL_NAV_ITEMS}
      role={currentRole}
      user={{
        full_name: 'Dr. K. Senthil Nathan',
        username: 'senthil_tnv',
        role: currentRole
      }}
      onLogout={() => alert('Sign out triggered (demonstration only)')}
    >
      <div className="space-y-12">
        {/* =====================================================================
            Developer Notice & Role Filter Testing
            ===================================================================== */}
        <div className="card-padded bg-brand-green-tint/40 border-brand-green-tint flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="badge bg-brand-green text-white mb-1.5">Developer Reference</span>
            <h2 className="font-display text-lg font-bold text-brand-green-dark">
              Section A: Global Design System & Component Preview
            </h2>
            <p className="text-xs text-neutral-muted mt-0.5">
              Testing mobile-first responsiveness, WCAG 2.1 AA accessibility, and role-based portal layout.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="role-select" className="text-xs font-bold text-brand-green-dark whitespace-nowrap">
              Preview Role:
            </label>
            <select
              id="role-select"
              value={currentRole}
              onChange={e => setCurrentRole(e.target.value)}
              className="min-h-tap rounded-lg border border-brand-green bg-white px-3 py-1.5 text-xs font-semibold text-neutral-ink focus:outline-none focus:ring-2 focus:ring-brand-yellow"
            >
              <option value="master_admin">Master Admin (All items)</option>
              <option value="dept_admin">Dept Admin (Dept items)</option>
              <option value="volunteer">Volunteer (Volunteer items)</option>
              <option value="public">Public / Restricted (Base items)</option>
            </select>
          </div>
        </div>

        {/* =====================================================================
            1. PageHeader Component
            ===================================================================== */}
        <section aria-labelledby="header-section">
          <PageHeader
            title="Tamil Nadu Volunteer Operations"
            subtitle="Centralised coordinating hub for disaster response, environmental conservation, and social welfare programs across 38 districts."
            breadcrumbs={[
              { label: 'Portal', to: '/dev/ui-kit' },
              { label: 'Design System', to: '/dev/ui-kit' },
              { label: 'UI Kit Showcase' }
            ]}
            actions={
              <>
                <Button
                  variant="outline"
                  icon={<Icon name="filter" className="h-4 w-4" />}
                  onClick={() => alert('Filter clicked')}
                >
                  Filter View
                </Button>
                <Button
                  variant="primary"
                  icon={<Icon name="plus" className="h-4 w-4" />}
                  onClick={() => setDrawerOpen(true)}
                >
                  New Action
                </Button>
              </>
            }
          />
        </section>

        {/* =====================================================================
            2. StatCards Grid (All 4 Tones: neutral, good, warn, danger)
            ===================================================================== */}
        <section aria-labelledby="stats-heading" className="space-y-4">
          <h2 id="stats-heading" className="section-title">
            1. Operational KPI Metrics (StatCards)
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Active Volunteers"
              value="12,450"
              hint="+350 onboarded this week"
              tone="neutral"
              icon={<Icon name="users" className="h-5 w-5" />}
            />
            <StatCard
              label="Tasks Completed"
              value="1,842"
              hint="94.2% completion rate"
              tone="good"
              icon={<Icon name="check" className="h-5 w-5" />}
            />
            <StatCard
              label="Pending Reviews"
              value="38"
              hint="Requires verification lead"
              tone="warn"
            />
            <StatCard
              label="Overdue Critical Tasks"
              value="7"
              hint="3 districts urgent SLA"
              tone="danger"
            />
          </div>
        </section>

        {/* =====================================================================
            3. StatusBadges (All 6 Task States)
            ===================================================================== */}
        <section aria-labelledby="status-heading" className="space-y-4">
          <h2 id="status-heading" className="section-title">
            2. Task State Semantic Tokens (StatusBadges)
          </h2>
          <div className="card-padded flex flex-wrap items-center gap-3">
            <StatusBadge status="not-started" />
            <StatusBadge status="in-progress" />
            <StatusBadge status="submitted-review" />
            <StatusBadge status="completed" />
            <StatusBadge status="rework" />
            <StatusBadge status="overdue" />
          </div>
        </section>

        {/* =====================================================================
            4. Buttons (Variants, Sizes, Loading, Disabled)
            ===================================================================== */}
        <section aria-labelledby="buttons-heading" className="space-y-4">
          <h2 id="buttons-heading" className="section-title">
            3. Accessible Action Buttons
          </h2>
          <div className="card-padded space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">Primary Action</Button>
              <Button variant="outline">Secondary Outline</Button>
              <Button variant="ghost">Ghost Option</Button>
              <Button variant="danger">Critical Danger</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" variant="primary" icon={<Icon name="check" className="h-5 w-5" />}>
                Large Primary (with icon)
              </Button>
              <Button
                variant="outline"
                loading={buttonLoading}
                onClick={() => {
                  setButtonLoading(true);
                  setTimeout(() => setButtonLoading(false), 2000);
                }}
              >
                {buttonLoading ? 'Processing...' : 'Click to test loading'}
              </Button>
              <Button variant="primary" disabled>
                Disabled Button
              </Button>
            </div>
          </div>
        </section>

        {/* =====================================================================
            5. Tabs Primitive
            ===================================================================== */}
        <section aria-labelledby="tabs-heading" className="space-y-4">
          <h2 id="tabs-heading" className="section-title">
            4. Accessible Tabs Navigation
          </h2>
          <div className="card-padded space-y-4">
            <Tabs
              tabs={[
                { id: 'weekly', label: 'Weekly Overview', icon: <Icon name="calendar" className="h-4 w-4" />, count: 14 },
                { id: 'monthly', label: 'Monthly Summary', icon: <Icon name="clock" className="h-4 w-4" />, count: 86 },
                { id: 'archived', label: 'Archived Initiatives', count: 210 }
              ]}
              activeId={activeTab}
              onChange={setActiveTab}
            />
            <p className="text-sm text-neutral-muted">
              Current active tab view: <strong className="text-brand-green-dark">{activeTab}</strong>. Supports keyboard Left/Right arrows and Home/End.
            </p>
          </div>
        </section>

        {/* =====================================================================
            6. DataTable Primitive (Hybrid Table / Mobile Cards)
            ===================================================================== */}
        <section aria-labelledby="table-heading" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 id="table-heading" className="section-title">
                5. Hybrid Responsive DataTable
              </h2>
              <p className="text-xs text-neutral-muted">
                Desktop (&ge;768px): Real semantic table with sticky header. Mobile (&lt;768px): Stacked cards, zero horizontal scroll.
              </p>
            </div>

            <Button
              variant="outline"
              size="md"
              className="!text-xs self-start sm:self-auto"
              onClick={() => setTableLoading(l => !l)}
            >
              {tableLoading ? 'Show Table Data' : 'Test Table Loading State'}
            </Button>
          </div>

          <DataTable
            columns={tableColumns}
            rows={SAMPLE_TASKS}
            rowKey="id"
            loading={tableLoading}
            caption="Tamil Nadu Volunteer Operations Tasks Queue"
            onRowClick={row => {
              setSelectedTask(row);
              setDrawerOpen(true);
            }}
          />
        </section>

        {/* =====================================================================
            7. FileUpload Primitive
            ===================================================================== */}
        <section aria-labelledby="upload-heading" className="space-y-4">
          <h2 id="upload-heading" className="section-title">
            6. Accessible Dual-Trigger FileUpload
          </h2>
          <FileUpload
            label="Upload Volunteer Identification or Field Photographs"
            accept=".png,.jpg,.jpeg,.pdf"
            maxSizeMB={5}
            multiple={true}
            onChange={files => setUploadedFiles(files)}
          />
          {uploadedFiles.length > 0 && (
            <p className="text-xs font-semibold text-brand-green">
              {uploadedFiles.length} file(s) ready in memory (client-side only, no external transmission).
            </p>
          )}
        </section>

        {/* =====================================================================
            8. FormSection with Existing FormField
            ===================================================================== */}
        <section aria-labelledby="forms-heading" className="space-y-4">
          <h2 id="forms-heading" className="section-title">
            7. FormSection Layout (1 Col Mobile &rarr; 2 Col Desktop)
          </h2>
          <FormSection
            title="Tamil Nadu Disaster Response Unit Allocation"
            description="Assign field coordinators and emergency contact parameters."
          >
            <FormField id="coordinator_name" label="Field Coordinator Name" hint="Full legal name as per ID">
              {fieldProps => (
                <input
                  type="text"
                  placeholder="e.g. S. Arulmozhi"
                  className={inputClass(false)}
                  {...fieldProps}
                />
              )}
            </FormField>

            <FormField id="district_zone" label="Assigned District">
              {fieldProps => (
                <select className={inputClass(false)} {...fieldProps}>
                  <option value="Chennai">Chennai</option>
                  <option value="Cuddalore">Cuddalore</option>
                  <option value="Madurai">Madurai</option>
                  <option value="Coimbatore">Coimbatore</option>
                </select>
              )}
            </FormField>

            <FormField id="contact_phone" label="Emergency Hotline Phone">
              {fieldProps => (
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  className={inputClass(false)}
                  {...fieldProps}
                />
              )}
            </FormField>

            <FormField id="notes" label="Special Operations Directives">
              {fieldProps => (
                <input
                  type="text"
                  placeholder="Supply route coordinates or backup hub"
                  className={inputClass(false)}
                  {...fieldProps}
                />
              )}
            </FormField>
          </FormSection>
        </section>

        {/* =====================================================================
            9. EmptyState Primitive
            ===================================================================== */}
        <section aria-labelledby="empty-heading" className="space-y-4">
          <h2 id="empty-heading" className="section-title">
            8. EmptyState Component
          </h2>
          <EmptyState
            title="No Pending Document Verifications"
            message="All volunteer onboarding packets for this district have been successfully reviewed and verified."
            action={
              <Button variant="primary" onClick={() => alert('Action triggered')}>
                Refresh Review Queue
              </Button>
            }
          />
        </section>

        {/* =====================================================================
            10. Inline SVG Icon Set
            ===================================================================== */}
        <section aria-labelledby="icons-heading" className="space-y-4">
          <h2 id="icons-heading" className="section-title">
            9. Handcrafted Inline SVG Icons (Zero Dependencies)
          </h2>
          <div className="card-padded grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 text-center">
            {ICONS_LIST.map(iconName => (
              <div
                key={iconName}
                className="flex flex-col items-center justify-center p-3 rounded-lg border border-brand-green-tint/50 bg-neutral-bg/40 hover:bg-white hover:border-brand-green transition-colors"
              >
                <Icon name={iconName} className="h-6 w-6 text-brand-green-dark" />
                <span className="mt-2 text-xs font-medium text-neutral-ink truncate max-w-full">
                  {iconName}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* =====================================================================
            11. Drawer Component (Modal / Bottom-sheet)
            ===================================================================== */}
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          title={selectedTask ? selectedTask.name : 'Operation Details'}
          footer={
            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" size="md" onClick={() => setDrawerOpen(false)}>
                Dismiss
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  alert('Changes recorded');
                  setDrawerOpen(false);
                }}
              >
                Save Updates
              </Button>
            </div>
          }
        >
          {selectedTask ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-muted">Task ID</p>
                <p className="font-mono text-sm font-semibold text-neutral-ink">{selectedTask.id}</p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-muted">Current Status</p>
                <div className="mt-1">
                  <StatusBadge status={selectedTask.status} />
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-muted">Department</p>
                <p className="text-sm font-medium text-neutral-ink">{selectedTask.department}</p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-muted">Assignee</p>
                <p className="text-sm font-medium text-neutral-ink">{selectedTask.assignee}</p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-muted">Due Date</p>
                <p className="text-sm font-medium text-neutral-ink">{selectedTask.dueDate}</p>
              </div>

              <div className="border-t border-brand-green-tint pt-4">
                <p className="text-xs text-neutral-muted leading-relaxed">
                  Drawer operates as a right slide-over panel on desktop (&ge;768px) and a bottom sheet on mobile screens (&lt;768px). Includes focus trap, body scroll lock, backdrop dismissal, and Esc key detection.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-neutral-ink">
                Drawer demo content. Select any task row in the table above to view dynamic task information.
              </p>
            </div>
          )}
        </Drawer>
      </div>
    </PortalShell>
  );
}
