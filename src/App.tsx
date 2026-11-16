import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BadgeIndianRupee,
  Banknote,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Users,
  Wallet,
  X,
} from "lucide-react";
import {
  BrowserRouter,
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useAppDispatch, useAppSelector } from "./app/hooks";
import { signedIn, signedOut } from "./features/auth/authSlice";
import {
  apiDataReceived,
  employeeRemoved,
  employeeSaved,
  employeesLoadFailed,
  employeesLoading as startEmployeesLoading,
  summaryLoading,
  summaryReceived,
  salaryChanged,
} from "./features/employees/employeesSlice";
import {
  createEmployeeWithApi,
  deleteEmployeeFromApi,
  getEmployeeSummaryFromApi,
  getEmployeesPageFromApi,
  getRoles,
  isApiConfigured,
  loginWithApi,
  logoutFromApi,
  updateEmployeeWithApi,
  updateSalaryWithApi,
} from "./services/api";
import type { AppUser, Employee, EmployeeInput, RoleOption } from "./types";
import "./App.css";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/employees": "Employees",
  "/salary": "Salary management",
};

function canManageEmployees(user: AppUser | null) {
  return (
    user?.roles.some((role) => ["System_ADMIN", "HR"].includes(role)) ?? false
  );
}

function ProtectedRoute() {
  const user = useAppSelector((state) => state.auth.user);
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

function LoginPage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("ramdayalpatel.example@gmail.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const logoutNotice = (location.state as { notice?: string } | null)?.notice;

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (isApiConfigured) {
        const result = await loginWithApi(email.trim(), password);
        dispatch(
          signedIn({ user: result.user, token: result.token, source: "api" }),
        );
      } else {
        const normalizedEmail = email.trim().toLowerCase();
        const demoAccounts: Record<string, AppUser> = {
          "ramdayalpatel.example@gmail.com": {
            id: "local-admin",
            name: "Alex Morgan",
            email: normalizedEmail,
            roles: ["HR"],
          },
          "user@example.com": {
            id: "local-user",
            name: "Jordan Lee",
            email: normalizedEmail,
            roles: ["User"],
          },
        };
        const demoUser = demoAccounts[normalizedEmail];
        if (
          !demoUser ||
          password !==
            (normalizedEmail.startsWith("admin") ? "admin123" : "user123")
        ) {
          throw new Error(
            "Use admin@example.com / admin123 or user@example.com / user123.",
          );
        }
        dispatch(signedIn({ user: demoUser, token: null, source: "local" }));
      }
      navigate("/", { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-screen">
      <div className="login-card">
        <div className="brand-mark">
          <Wallet size={23} strokeWidth={2.2} />
        </div>
        <p className="eyebrow">PAYROLL & PEOPLE</p>
        <h1>Welcome back</h1>
        <p className="muted login-intro">
          Sign in to your salary management workspace.
        </p>
        {logoutNotice && (
          <p className="notice-banner login-notice" role="alert">
            {logoutNotice}
          </p>
        )}
        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="login-email">Email address</label>
          <input
            id="login-email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="button button-primary login-submit"
            type="submit"
            disabled={busy}
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        {!isApiConfigured && (
          <p className="demo-hint">
            Demo: ramdayalpatel.example@gmail.com / Ramdayal@123
          </p>
        )}
        <p className="login-footnote">
          {isApiConfigured
            ? "Connected to your Salary Management API"
            : "Secure workspace · Your data stays in this browser"}
        </p>
      </div>
    </main>
  );
}

function AppLayout() {
  const dispatch = useAppDispatch();
  const { user, token } = useAppSelector((state) => state.auth);
  const employees = useAppSelector((state) => state.employees.items);
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!isApiConfigured || !token) return;
    let active = true;
    dispatch(startEmployeesLoading());
    dispatch(summaryLoading());
    Promise.all([
      getEmployeeSummaryFromApi(token),
      getEmployeesPageFromApi(token, 1),
    ])
      .then(([summary, page]) => {
        if (!active) return;
        dispatch(summaryReceived(summary));
        dispatch(apiDataReceived({ ...page, search: "" }));
      })
      .catch((error: unknown) => {
        if (active) {
          dispatch(employeesLoadFailed());
          setNotice(
            error instanceof Error
              ? error.message
              : "Could not load employees from the API.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [dispatch, token]);

  async function handleLogout() {
    let logoutNotice: string | undefined;
    if (isApiConfigured && token) {
      try {
        await logoutFromApi(token);
      } catch (error) {
        logoutNotice =
          error instanceof Error
            ? `Signed out locally; API logout failed: ${error.message}`
            : "Signed out locally; API logout failed.";
      }
    }
    dispatch(signedOut());
    navigate("/login", {
      replace: true,
      state: logoutNotice ? { notice: logoutNotice } : undefined,
    });
  }

  const title = pageTitles[location.pathname] ?? "Salary management";
  const initials = user?.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="nav-section-label">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          <NavLink to="/" end onClick={() => setMenuOpen(false)}>
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/employees" onClick={() => setMenuOpen(false)}>
            <Users size={18} />
            <span>Employees</span>
            <span className="nav-count">{employees.length}</span>
          </NavLink>
          <NavLink to="/salary" onClick={() => setMenuOpen(false)}>
            <BadgeIndianRupee size={18} />
            <span>Salary management</span>
          </NavLink>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-divider" />
          <button className="profile-card" onClick={handleLogout}>
            <span className="avatar">{initials}</span>
            <span className="profile-copy">
              <strong>{user?.name}</strong>
              <span>{user?.roles.join(", ") || "User"}</span>
            </span>
            <LogOut size={16} className="profile-logout" />
          </button>
        </div>
      </aside>
      {menuOpen && (
        <button
          className="sidebar-scrim"
          onClick={() => setMenuOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <div className="main-column">
        <header className="topbar">
          <button
            className="icon-button menu-toggle"
            onClick={() => setMenuOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
          <div className="breadcrumbs">
            <span>Workspace</span>
            <span className="breadcrumb-separator">/</span>
            <strong>{title}</strong>
          </div>
          <div className="topbar-actions">
            <span
              className={`connection-pill ${isApiConfigured ? "connection-api" : ""}`}
            >
              <span />
              {isApiConfigured ? "API connected" : "Local workspace"}
            </span>
            <button
              className="icon-button notification-button"
              aria-label="Notifications"
            >
              <Bell size={18} />
              <i />
            </button>
            <button
              className="topbar-user"
              onClick={handleLogout}
              title="Sign out"
            >
              <span className="avatar">{initials}</span>
              <ChevronDown size={15} />
            </button>
          </div>
        </header>
        <main className="page-content">
          {notice && (
            <div className="notice-banner" role="alert">
              <span>{notice}</span>
              <button onClick={() => setNotice("")} aria-label="Dismiss">
                <X size={16} />
              </button>
            </div>
          )}
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>© {new Date().getFullYear()} Ramdayal Patel</span>
          <span>Built for better work</span>
        </footer>
      </div>
    </div>
  );
}

function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {action}
    </div>
  );
}

function DashboardPage() {
  const employees = useAppSelector((state) => state.employees.items);
  const isLoadingEmployees = useAppSelector((state) => state.employees.loading);
  const summary = useAppSelector((state) => state.employees.summary);
  const summaryLoading = useAppSelector(
    (state) => state.employees.summaryLoading,
  );
  const user = useAppSelector((state) => state.auth.user);
  const navigate = useNavigate();
  const payroll = employees.reduce(
    (sum, employee) => sum + employee.monthlySalary,
    0,
  );
  const recent = [...employees].slice(0, 5);

  return (
    <>
      <PageHeading
        eyebrow="OVERVIEW"
        title={`Good morning, ${user?.name.split(" ")[0] ?? "there"}`}
        description="Here’s what’s happening with your team today."
      />
      <div className="welcome-strip">
        <div>
          <span className="welcome-icon">
            <BriefcaseBusiness size={19} />
          </span>
          <span>
            Welcome back, <strong>{user?.name}</strong>. You’re viewing your{" "}
            <b>{user?.roles.join(", ") || "User"}</b> workspace.
          </span>
        </div>
        <span className="welcome-date">
          <CalendarDays size={15} />
          {new Intl.DateTimeFormat("en", {
            weekday: "long",
            month: "long",
            day: "numeric",
          }).format(new Date())}
        </span>
      </div>
      <section className="stats-grid" aria-label="Dashboard summary">
        <article className="stat-card">
          <div className="stat-top">
            <span className="stat-icon icon-lilac">
              <Users size={19} />
            </span>
            <span className="stat-trend trend-up">
              <ArrowUpRight size={14} /> 8.2%
            </span>
          </div>
          <p className="stat-label">Total employees</p>
          <p className="stat-value">
            {(summary?.totalEmployees ?? employees.length).toLocaleString()}
          </p>
          <p className="stat-note">
            <span className="positive-dot" />
            {summaryLoading
              ? "Loading employee count…"
              : "Employees in the system"}
          </p>
        </article>
        <article className="stat-card">
          <div className="stat-top">
            <span className="stat-icon icon-green">
              <Wallet size={19} />
            </span>
            <span className="stat-trend trend-up">
              <ArrowUpRight size={14} /> 4.6%
            </span>
          </div>
          <p className="stat-label">Monthly payroll</p>
          <p className="stat-value">
            {currency.format(summary?.totalSalary ?? payroll)}
          </p>
          <p className="stat-note">Across all employees</p>
        </article>
        <article className="stat-card">
          <div className="stat-top">
            <span className="stat-icon icon-blue">
              <BriefcaseBusiness size={19} />
            </span>
            <span className="stat-trend trend-neutral">This month</span>
          </div>
          <p className="stat-label">Roles</p>
          <p className="stat-value">
            {summary?.roleCount ??
              new Set(employees.map((employee) => employee.designation)).size}
          </p>
          <p className="stat-note">
            {summaryLoading ? "Loading roles…" : "Assigned to employees"}
          </p>
        </article>
      </section>
      <section className="content-card recent-card">
        <div className="section-heading">
          <div>
            <h2>Recent employees</h2>
            <p>Keep an eye on your growing team.</p>
          </div>
          <button
            className="button button-secondary"
            onClick={() => navigate("/employees")}
          >
            <Users size={16} />
            View all employees
          </button>
        </div>
        <EmployeeTable
          employees={recent}
          loading={isLoadingEmployees}
          compact
          onView={(employee) => navigate(`/employees?view=${employee.id}`)}
        />
      </section>
      {canManageEmployees(user) && (
        <section className="bottom-cta">
          <div>
            <span className="cta-icon">
              <Plus size={19} />
            </span>
            <div>
              <h3>Growing your team?</h3>
            </div>
          </div>
          <button
            className="button button-primary"
            onClick={() => navigate("/employees?new=1")}
          >
            <Plus size={16} />
            Add employee
          </button>
        </section>
      )}
    </>
  );
}

function EmployeeTable({
  employees,
  loading = false,
  compact = false,
  canManage = true,
  onView,
  onEdit,
  onDelete,
}: {
  employees: Employee[];
  loading?: boolean;
  compact?: boolean;
  canManage?: boolean;
  onView: (employee: Employee) => void;
  onEdit?: (employee: Employee) => void;
  onDelete?: (employee: Employee) => void;
}) {
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Employee ID</th>
            <th>Department</th>
            <th>Monthly salary</th>
            <th>Status</th>
            {!compact && canManage && <th aria-label="Actions" />}
          </tr>
        </thead>
        <tbody>
          {employees.map((employee) => (
            <tr key={employee.id}>
              <td>
                <button
                  className="employee-cell"
                  onClick={() => onView(employee)}
                >
                  <span
                    className={`employee-avatar avatar-${employee.name.charCodeAt(0) % 5}`}
                  >
                    {employee.name
                      .split(/\s+/)
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </span>
                  <span>
                    <strong>{employee.name}</strong>
                    <small>{employee.email}</small>
                  </span>
                </button>
              </td>
              <td>
                <span className="employee-id">{employee.employeeId}</span>
              </td>
              <td>
                <span className="department-cell">
                  {employee.department || "—"}
                </span>
              </td>
              <td className="salary-cell">
                {currency.format(employee.monthlySalary)}
              </td>
              <td>
                <span
                  className={`status-badge ${employee.status === "Active" ? "status-active" : "status-inactive"}`}
                >
                  <i />
                  {employee.status}
                </span>
              </td>
              {!compact && canManage && (
                <td>
                  <div className="row-actions">
                    <button
                      className="icon-button"
                      onClick={() => onView(employee)}
                      title="View details"
                      aria-label={`View ${employee.name}`}
                    >
                      <MoreHorizontal size={18} />
                    </button>
                    <button
                      className="icon-button"
                      onClick={() => onEdit?.(employee)}
                      title="Edit employee"
                      aria-label={`Edit ${employee.name}`}
                    >
                      <Settings size={16} />
                    </button>
                    <button
                      className="icon-button danger-hover"
                      onClick={() => onDelete?.(employee)}
                      title="Delete employee"
                      aria-label={`Delete ${employee.name}`}
                    >
                      <X size={17} />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
          {employees.length === 0 && (
            <tr>
              <td
                className="empty-cell"
                colSpan={compact || !canManage ? 5 : 6}
              >
                {loading ? "Loading employees…" : "No data found."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Pagination({
  page,
  pageCount,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;
  return (
    <div className="pagination" aria-label="Table pages">
      <button
        className="pagination-button"
        aria-label="Previous page"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft size={14} />
      </button>
      <span>
        Page <strong>{page}</strong> of <strong>{pageCount}</strong>
      </span>
      <button
        className="pagination-button"
        aria-label="Next page"
        disabled={page === pageCount}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

const emptyEmployeeForm: EmployeeInput = {
  employeeId: "",
  name: "",
  email: "",
  phone: "",
  department: "",
  designation: "",
  monthlySalary: 0,
  joiningDate: new Date().toISOString().slice(0, 10),
  status: "Active",
  roleIds: [],
};

function EmployeeFormModal({
  employee,
  roles,
  onClose,
  onSave,
}: {
  employee: Employee | null;
  roles: RoleOption[];
  onClose: () => void;
  onSave: (input: EmployeeInput, password: string) => Promise<void>;
}) {
  const [form, setForm] = useState<EmployeeInput>(
    employee
      ? {
          employeeId: employee.employeeId,
          name: employee.name,
          email: employee.email,
          phone: employee.phone,
          department: employee.department,
          designation: employee.designation,
          monthlySalary: employee.monthlySalary,
          joiningDate: employee.joiningDate,
          status: employee.status,
          roleIds: employee.roleIds,
        }
      : emptyEmployeeForm,
  );
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function setField<K extends keyof EmployeeInput>(
    key: K,
    value: EmployeeInput[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave(form, password);
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to save employee.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="modal-panel employee-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="employee-modal-title"
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">
              {employee ? "EMPLOYEE DETAILS" : "NEW TEAM MEMBER"}
            </p>
            <h2 id="employee-modal-title">
              {employee ? "Edit employee" : "Add employee"}
            </h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="form-grid">
            <label>
              Employee ID
              <input
                required
                value={form.employeeId}
                onChange={(event) => setField("employeeId", event.target.value)}
                placeholder="EMP-0106"
              />
            </label>
            <label>
              Full name
              <input
                required
                value={form.name}
                onChange={(event) => setField("name", event.target.value)}
                placeholder="e.g. Maya Chen"
              />
            </label>
            <label>
              Email address
              <input
                required
                type="email"
                value={form.email}
                onChange={(event) => setField("email", event.target.value)}
                placeholder="name@company.com"
              />
            </label>
            <label>
              Phone number
              <input
                required
                inputMode="numeric"
                pattern="[0-9]{10}"
                value={form.phone}
                onChange={(event) => setField("phone", event.target.value)}
                placeholder="10 digit phone number"
              />
            </label>
            <label>
              Department
              <select
                required
                value={form.department}
                onChange={(event) => setField("department", event.target.value)}
              >
                <option value="">Select department</option>
                {[
                  "Engineering",
                  "People",
                  "Finance",
                  "Design",
                  "Marketing",
                  "Operations",
                  "Sales",
                ].map((department) => (
                  <option key={department}>{department}</option>
                ))}
              </select>
            </label>
            <label>
              Designation
              <input
                required
                value={form.designation}
                onChange={(event) =>
                  setField("designation", event.target.value)
                }
                placeholder="e.g. Product Designer"
              />
            </label>
            <label>
              Monthly salary
              <input
                required
                type="number"
                min="1"
                step="1"
                value={form.monthlySalary || ""}
                onChange={(event) =>
                  setField("monthlySalary", Number(event.target.value))
                }
                placeholder="0"
              />
            </label>
            <label>
              Joining date
              <input
                required
                type="date"
                value={form.joiningDate}
                onChange={(event) =>
                  setField("joiningDate", event.target.value)
                }
              />
            </label>
            <label>
              Status
              <select
                value={form.status}
                onChange={(event) =>
                  setField("status", event.target.value as Employee["status"])
                }
              >
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </label>
            {isApiConfigured && (
              <label>
                Access role
                <select
                  required
                  value={form.roleIds[0] ?? ""}
                  onChange={(event) =>
                    setField(
                      "roleIds",
                      event.target.value ? [event.target.value] : [],
                    )
                  }
                >
                  <option value="">Select role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {isApiConfigured && !employee && (
              <label className="form-span">
                Temporary password
                <input
                  required
                  type="password"
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                />
              </label>
            )}
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="modal-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button button-primary"
              disabled={saving}
            >
              {saving ? "Saving…" : employee ? "Save changes" : "Add employee"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function EmployeeDetailsModal({
  employee,
  onClose,
  onEdit,
  canManage = true,
}: {
  employee: Employee;
  onClose: () => void;
  onEdit: () => void;
  canManage?: boolean;
}) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="modal-panel detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="employee-detail-title"
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">EMPLOYEE PROFILE</p>
            <h2 id="employee-detail-title">Employee details</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="detail-person">
          <span className="employee-avatar avatar-2">
            {employee.name
              .split(/\s+/)
              .map((part) => part[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </span>
          <div>
            <h3>{employee.name}</h3>
            <p>{employee.designation}</p>
          </div>
          <span
            className={`status-badge ${employee.status === "Active" ? "status-active" : "status-inactive"}`}
          >
            <i />
            {employee.status}
          </span>
        </div>
        <div className="detail-grid">
          {[
            ["Employee ID", employee.employeeId],
            ["Email", employee.email],
            ["Phone", employee.phone],
            ["Department", employee.department],
            ["Monthly salary", currency.format(employee.monthlySalary)],
            ["Joining date", employee.joiningDate || "—"],
          ].map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <button className="button button-secondary" onClick={onClose}>
            Close
          </button>
          {canManage && (
            <button className="button button-primary" onClick={onEdit}>
              <Settings size={15} />
              Edit profile
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function EmployeesPage() {
  const dispatch = useAppDispatch();
  const employees = useAppSelector((state) => state.employees.items);
  const isLoadingEmployees = useAppSelector((state) => state.employees.loading);
  const apiTotal = useAppSelector((state) => state.employees.total);
  const apiPage = useAppSelector((state) => state.employees.page);
  const apiSearch = useAppSelector((state) => state.employees.search);
  const token = useAppSelector((state) => state.auth.token);
  const user = useAppSelector((state) => state.auth.user);
  const canManage = canManageEmployees(user);
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("All departments");
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [viewing, setViewing] = useState<Employee | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const query = new URLSearchParams(location.search);
  const queryEmployee = employees.find((item) => item.id === query.get("view"));
  const selectedEmployee = viewing ?? queryEmployee;
  const queryNew = query.get("new") === "1";

  useEffect(() => {
    if (!isApiConfigured || !token) return;
    getRoles(token)
      .then(setRoles)
      .catch((caught: unknown) => {
        setError(
          caught instanceof Error ? caught.message : "Unable to load roles.",
        );
      });
  }, [token]);

  useEffect(() => {
    if (!isApiConfigured || !token) return;
    const normalizedSearch = search.trim();
    if (apiPage === page && apiSearch === normalizedSearch) return;
    let active = true;
    dispatch(startEmployeesLoading());
    getEmployeesPageFromApi(token, page, normalizedSearch)
      .then((result) => {
        if (active) {
          dispatch(apiDataReceived({ ...result, search: normalizedSearch }));
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          dispatch(employeesLoadFailed());
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load employees.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [apiPage, apiSearch, dispatch, page, search, token]);

  const filtered = useMemo(
    () =>
      employees.filter((employee) => {
        const matchesSearch =
          isApiConfigured ||
          `${employee.name} ${employee.employeeId} ${employee.email}`
            .toLowerCase()
            .includes(search.toLowerCase());
        return (
          matchesSearch &&
          (department === "All departments" ||
            employee.department === department)
        );
      }),
    [employees, search, department],
  );
  const departments = useMemo(
    () =>
      [
        ...new Set(
          employees.map((employee) => employee.department).filter(Boolean),
        ),
      ].sort(),
    [employees],
  );
  const totalItems = isApiConfigured ? apiTotal : filtered.length;
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize));
  const visibleEmployees = isApiConfigured
    ? filtered
    : filtered.slice((page - 1) * pageSize, page * pageSize);

  async function saveEmployee(input: EmployeeInput, password: string) {
    if (!canManage)
      throw new Error(
        "Your role does not have permission to change employees.",
      );
    setError("");
    if (editing) {
      const updated: Employee = { ...input, id: editing.id };
      const result =
        isApiConfigured && token
          ? await updateEmployeeWithApi(token, updated)
          : {};
      dispatch(
        employeeSaved(
          result.warning
            ? { ...updated, monthlySalary: editing.monthlySalary }
            : updated,
        ),
      );
      if (result.warning) setError(result.warning);
    } else {
      if (
        employees.some(
          (employee) =>
            employee.employeeId.toLowerCase() ===
            input.employeeId.toLowerCase(),
        )
      ) {
        throw new Error("That employee ID is already in use.");
      }
      const result =
        isApiConfigured && token
          ? await createEmployeeWithApi(token, input, password)
          : { employee: { ...input, id: crypto.randomUUID() } };
      dispatch(employeeSaved(result.employee));
      if (result.warning) setError(result.warning);
    }
    setPage(1);
    setEditing(null);
  }

  async function removeEmployee(employee: Employee) {
    if (!canManage) return;
    if (
      !window.confirm(`Delete ${employee.name}? This action cannot be undone.`)
    )
      return;
    try {
      if (isApiConfigured && token)
        await deleteEmployeeFromApi(token, employee.id);
      dispatch(employeeRemoved(employee.id));
      setPage(1);
      if (viewing?.id === employee.id) setViewing(null);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to delete employee.",
      );
    }
  }

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (employee: Employee) => {
    setViewing(null);
    if (query.get("view")) navigate("/employees", { replace: true });
    setEditing(employee);
    setFormOpen(true);
  };

  return (
    <>
      <PageHeading
        eyebrow="PEOPLE DIRECTORY"
        title="Your team"
        description="Manage your people, roles, and employee information."
        action={
          canManage ? (
            <button className="button button-primary" onClick={openNew}>
              <Plus size={17} />
              Add employee
            </button>
          ) : undefined
        }
      />
      {error && (
        <div className="inline-error" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Dismiss">
            <X size={15} />
          </button>
        </div>
      )}
      <section className="content-card directory-card">
        <div className="directory-toolbar">
          <div className="directory-count">
            <strong>All employees</strong>
            <span>{employees.length}</span>
          </div>
          <div className="table-controls">
            <label className="search-field">
              <Search size={17} />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search name or email..."
                aria-label="Search employees"
              />
            </label>
            <select
              className="filter-select"
              value={department}
              onChange={(event) => {
                setDepartment(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by department"
            >
              <option>All departments</option>
              {departments.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <button
              className="button button-secondary filter-button"
              onClick={() => {
                setSearch("");
                setDepartment("All departments");
                setPage(1);
              }}
            >
              Reset
            </button>
          </div>
        </div>
        <EmployeeTable
          employees={visibleEmployees}
          loading={isLoadingEmployees}
          canManage={canManage}
          onView={setViewing}
          onEdit={openEdit}
          onDelete={removeEmployee}
        />
        <div className="table-footer">
          <span>
            Showing{" "}
            <strong>
              {totalItems ? (page - 1) * pageSize + 1 : 0}–
              {Math.min(page * pageSize, totalItems)}
            </strong>{" "}
            of <strong>{totalItems}</strong> employees
          </span>
          <Pagination
            page={page}
            pageCount={pageCount}
            onPageChange={setPage}
          />
          <span className="table-footer-note">
            <Check size={14} />
            All changes saved
          </span>
        </div>
      </section>
      {(formOpen || queryNew) && (
        <EmployeeFormModal
          employee={editing}
          roles={roles}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
            if (queryNew) navigate("/employees", { replace: true });
          }}
          onSave={saveEmployee}
        />
      )}
      {selectedEmployee && (
        <EmployeeDetailsModal
          employee={selectedEmployee}
          canManage={canManage}
          onClose={() => {
            setViewing(null);
            if (query.get("view")) navigate("/employees", { replace: true });
          }}
          onEdit={() => openEdit(selectedEmployee)}
        />
      )}
    </>
  );
}

function SalaryPage() {
  const dispatch = useAppDispatch();
  const employees = useAppSelector((state) => state.employees.items);
  const isLoadingEmployees = useAppSelector((state) => state.employees.loading);
  const apiTotal = useAppSelector((state) => state.employees.total);
  const apiPage = useAppSelector((state) => state.employees.page);
  const apiSearch = useAppSelector((state) => state.employees.search);
  const summary = useAppSelector((state) => state.employees.summary);
  const token = useAppSelector((state) => state.auth.token);
  const user = useAppSelector((state) => state.auth.user);
  const canManage = canManageEmployees(user);
  const [department, setDepartment] = useState("All departments");
  const [editing, setEditing] = useState<Employee | null>(null);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const departments = [
    ...new Set(
      employees.map((employee) => employee.department).filter(Boolean),
    ),
  ].sort();
  const filtered = employees.filter(
    (employee) =>
      department === "All departments" || employee.department === department,
  );
  const totalItems = isApiConfigured ? apiTotal : filtered.length;
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize));
  const visibleEmployees = isApiConfigured
    ? filtered
    : filtered.slice((page - 1) * pageSize, page * pageSize);
  const pageTotal = filtered.reduce(
    (sum, employee) => sum + employee.monthlySalary,
    0,
  );
  const total =
    isApiConfigured && department === "All departments"
      ? (summary?.totalSalary ?? pageTotal)
      : pageTotal;

  useEffect(() => {
    if (!isApiConfigured || !token) return;
    if (apiPage === page && apiSearch === "") return;
    let active = true;
    dispatch(startEmployeesLoading());
    getEmployeesPageFromApi(token, page)
      .then((result) => {
        if (active) {
          dispatch(apiDataReceived({ ...result, search: "" }));
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          dispatch(employeesLoadFailed());
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load salary records.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [apiPage, apiSearch, dispatch, page, token]);

  async function saveSalary(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    if (!canManage) {
      setError("Your role does not have permission to change salaries.");
      return;
    }
    const nextAmount = Number(amount);
    setSaving(true);
    setError("");
    try {
      if (isApiConfigured && token)
        await updateSalaryWithApi(token, editing.id, nextAmount);
      dispatch(salaryChanged({ id: editing.id, amount: nextAmount }));
      setEditing(null);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to update salary.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="PAYROLL"
        title="Salary management"
        description="Review monthly compensation and keep payroll up to date."
      />
      {error && (
        <div className="inline-error" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Dismiss">
            <X size={15} />
          </button>
        </div>
      )}
      <div className="salary-summary">
        <div className="salary-summary-copy">
          <span className="stat-icon icon-green">
            <Banknote size={19} />
          </span>
          <div>
            <p>Total monthly payroll</p>
            <strong>{currency.format(total)}</strong>
            <small>
              {department === "All departments"
                ? "Across all departments"
                : `For ${department}`}
            </small>
          </div>
        </div>
        <label className="filter-select-wrap">
          <span>Department</span>
          <select
            className="filter-select"
            value={department}
            onChange={(event) => {
              setDepartment(event.target.value);
              setPage(1);
            }}
          >
            <option>All departments</option>
            {departments.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>
      <section className="content-card directory-card">
        <div className="section-heading salary-table-heading">
          <div>
            <h2>Employee salaries</h2>
            <p>Monthly salary by employee and department.</p>
          </div>
          <span className="salary-employee-count">
            <Users size={15} />
            {totalItems} employees
          </span>
        </div>
        <div className="table-scroll">
          <table className="data-table salary-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Monthly salary</th>
                <th>Annual estimate</th>
                {canManage && <th />}
              </tr>
            </thead>
            <tbody>
              {visibleEmployees.map((employee) => (
                <tr key={employee.id}>
                  <td>
                    <div className="employee-cell">
                      <span
                        className={`employee-avatar avatar-${employee.name.charCodeAt(0) % 5}`}
                      >
                        {employee.name
                          .split(/\s+/)
                          .map((part) => part[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </span>
                      <span>
                        <strong>{employee.name}</strong>
                        <small>{employee.employeeId}</small>
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="department-cell">
                      {employee.department}
                    </span>
                  </td>
                  <td>{employee.designation}</td>
                  <td className="salary-cell">
                    {currency.format(employee.monthlySalary)}
                  </td>
                  <td className="annual-cell">
                    {currency.format(employee.monthlySalary * 12)}
                  </td>
                  {canManage && (
                    <td>
                      <button
                        className="button button-tertiary salary-edit-button"
                        onClick={() => {
                          setEditing(employee);
                          setAmount(String(employee.monthlySalary));
                        }}
                      >
                        <Settings size={15} />
                        Update
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {visibleEmployees.length === 0 && (
                <tr>
                  <td className="empty-cell" colSpan={canManage ? 6 : 5}>
                    {isLoadingEmployees
                      ? "Loading employees…"
                      : "No data found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span>
            Showing{" "}
            <strong>
              {totalItems ? (page - 1) * pageSize + 1 : 0}–
              {Math.min(page * pageSize, totalItems)}
            </strong>{" "}
            of <strong>{totalItems}</strong> employees
          </span>
          <Pagination
            page={page}
            pageCount={pageCount}
            onPageChange={setPage}
          />
          <span className="table-footer-note">
            <ArrowDownRight size={14} />
            Annual estimates exclude bonuses
          </span>
        </div>
      </section>
      {editing && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setEditing(null);
          }}
        >
          <section
            className="modal-panel salary-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="salary-modal-title"
          >
            <div className="modal-heading">
              <div>
                <p className="eyebrow">COMPENSATION</p>
                <h2 id="salary-modal-title">Update salary</h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setEditing(null)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <p className="salary-modal-employee">
              {editing.name} <span>· {editing.employeeId}</span>
            </p>
            <form onSubmit={saveSalary}>
              <label>
                Monthly salary (INR)
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </label>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <div className="modal-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </button>
                <button className="button button-primary" disabled={saving}>
                  {saving ? "Saving…" : "Save salary"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="/employees" element={<EmployeesPage />} />
            <Route path="/salary" element={<SalaryPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
