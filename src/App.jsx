import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Route, RouterProvider, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { ConfirmHost } from './components/ui/ConfirmHost';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { Login } from './pages/Login';
import { ANALYTICS_VIEW_KEYS, PRODUCTION_VIEW_KEYS, SALES_ORDER_VIEW_KEYS } from './lib/sales';

// Each screen is its own download, fetched the first time it is opened, so
// the first page load doesn't carry the whole app (it was one 500+ KB file).
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const RoleDetail = lazy(() => import('./pages/RoleDetail').then((m) => ({ default: m.RoleDetail })));
const Roles = lazy(() => import('./pages/Roles').then((m) => ({ default: m.Roles })));
const UserCreate = lazy(() => import('./pages/UserCreate').then((m) => ({ default: m.UserCreate })));
const UserEdit = lazy(() => import('./pages/UserEdit').then((m) => ({ default: m.UserEdit })));
const Users = lazy(() => import('./pages/Users').then((m) => ({ default: m.Users })));
const Inventory = lazy(() => import('./pages/Inventory').then((m) => ({ default: m.Inventory })));
const InventoryForm = lazy(() => import('./pages/InventoryForm').then((m) => ({ default: m.InventoryForm })));
const InventoryStages = lazy(() => import('./pages/InventoryStages').then((m) => ({ default: m.InventoryStages })));
const MachineForm = lazy(() => import('./pages/MachineForm').then((m) => ({ default: m.MachineForm })));
const Machines = lazy(() => import('./pages/Machines').then((m) => ({ default: m.Machines })));
const Suppliers = lazy(() => import('./pages/Suppliers').then((m) => ({ default: m.Suppliers })));
const SupplierForm = lazy(() => import('./pages/SupplierForm').then((m) => ({ default: m.SupplierForm })));
const CustomerAccount = lazy(() => import('./pages/CustomerAccount').then((m) => ({ default: m.CustomerAccount })));
const OpeningImport = lazy(() => import('./pages/OpeningImport').then((m) => ({ default: m.OpeningImport })));
const CreditNotePrint = lazy(() => import('./pages/CreditNotePrint').then((m) => ({ default: m.CreditNotePrint })));
const InvoicePrint = lazy(() => import('./pages/InvoicePrint').then((m) => ({ default: m.InvoicePrint })));
const Receivables = lazy(() => import('./pages/Receivables').then((m) => ({ default: m.Receivables })));
const CustomerStatement = lazy(() => import('./pages/CustomerStatement').then((m) => ({ default: m.CustomerStatement })));
const CompanySettings = lazy(() => import('./pages/CompanySettings').then((m) => ({ default: m.CompanySettings })));
const StageDetail = lazy(() => import('./pages/StageDetail').then((m) => ({ default: m.StageDetail })));
const Stages = lazy(() => import('./pages/Stages').then((m) => ({ default: m.Stages })));
const Customers = lazy(() => import('./pages/Customers').then((m) => ({ default: m.Customers })));
const CustomerForm = lazy(() => import('./pages/CustomerForm').then((m) => ({ default: m.CustomerForm })));
const SalesOrders = lazy(() => import('./pages/SalesOrders').then((m) => ({ default: m.SalesOrders })));
const SalesOrderForm = lazy(() => import('./pages/SalesOrderForm').then((m) => ({ default: m.SalesOrderForm })));
const SalesOrderDetail = lazy(() => import('./pages/SalesOrderDetail').then((m) => ({ default: m.SalesOrderDetail })));
const DraftOrders = lazy(() => import('./pages/DraftOrders').then((m) => ({ default: m.DraftOrders })));
const DraftOrderSetup = lazy(() => import('./pages/DraftOrderSetup').then((m) => ({ default: m.DraftOrderSetup })));
const DraftOrderDetail = lazy(() => import('./pages/DraftOrderDetail').then((m) => ({ default: m.DraftOrderDetail })));
const DraftOrderForm = lazy(() => import('./pages/DraftOrderForm').then((m) => ({ default: m.DraftOrderForm })));
const SalesSettings = lazy(() => import('./pages/SalesSettings').then((m) => ({ default: m.SalesSettings })));
const ProductTemplateForm = lazy(() => import('./pages/ProductTemplateForm').then((m) => ({ default: m.ProductTemplateForm })));
const RateCalculator = lazy(() => import('./pages/RateCalculator').then((m) => ({ default: m.RateCalculator })));
const OrderRegister = lazy(() => import('./pages/OrderRegister').then((m) => ({ default: m.OrderRegister })));
const Registers = lazy(() => import('./pages/Registers').then((m) => ({ default: m.Registers })));
const AuditLogs = lazy(() => import('./pages/AuditLogs').then((m) => ({ default: m.AuditLogs })));
const JobSheet = lazy(() => import('./pages/JobSheet').then((m) => ({ default: m.JobSheet })));
const StageSheet = lazy(() => import('./pages/StageSheet').then((m) => ({ default: m.StageSheet })));
const TaskPrint = lazy(() => import('./pages/TaskPrint').then((m) => ({ default: m.TaskPrint })));
const FormFields = lazy(() => import('./pages/FormFields').then((m) => ({ default: m.FormFields })));
const Purchases = lazy(() => import('./pages/Purchases').then((m) => ({ default: m.Purchases })));
const SupplierAccount = lazy(() => import('./pages/SupplierAccount').then((m) => ({ default: m.SupplierAccount })));
const Statements = lazy(() => import('./pages/Statements').then((m) => ({ default: m.Statements })));
const CashBank = lazy(() => import('./pages/CashBank').then((m) => ({ default: m.CashBank })));
const Books = lazy(() => import('./pages/Books').then((m) => ({ default: m.Books })));
const Reports = lazy(() => import('./pages/Reports').then((m) => ({ default: m.Reports })));
const Analytics = lazy(() => import('./pages/Analytics').then((m) => ({ default: m.Analytics })));
const Tasks = lazy(() => import('./pages/Tasks').then((m) => ({ default: m.Tasks })));

function ToRegister() {
  const { search } = useLocation();
  return <Navigate to={`/registers${search}`} replace />;
}

function AppRoutes() {
  return (
    <>
      <Suspense fallback={<p className="p-6 text-sm text-slate">Loading…</p>}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<ProtectedRoute anyOf={['accounts:read', 'sales:read']} />}>
              <Route path="invoices/:id/print" element={<InvoicePrint />} />
              <Route path="credit-notes/:id/print" element={<CreditNotePrint />} />
              <Route path="customers/:id/statement" element={<CustomerStatement />} />
            </Route>
            {/* Printable floor sheets (no sidebar). */}
            <Route element={<ProtectedRoute anyOf={PRODUCTION_VIEW_KEYS} />}>
              <Route path="job-sheets/stage/:stage" element={<StageSheet />} />
              <Route path="job-sheets/:orderId" element={<JobSheet />} />
            </Route>
            <Route element={<ProtectedRoute permission="tasks:read" />}>
              <Route path="tasks/:id/print" element={<TaskPrint />} />
            </Route>
            <Route element={<AppShell />}>
              <Route index element={<Dashboard />} />
              <Route element={<ProtectedRoute permission="users:read" />}>
                <Route path="users" element={<Users />} />
                <Route element={<ProtectedRoute permission="users:create" />}>
                  <Route path="users/new" element={<UserCreate />} />
                </Route>
                <Route path="users/:id" element={<UserEdit />} />
              </Route>
              <Route element={<ProtectedRoute permission="roles:read" />}>
                <Route path="roles" element={<Roles />} />
                <Route path="roles/:id" element={<RoleDetail />} />
              </Route>
              <Route element={<ProtectedRoute anyOf={SALES_ORDER_VIEW_KEYS} />}>
                <Route path="sales-orders" element={<SalesOrders />} />
                <Route element={<ProtectedRoute permission="sales:create" />}>
                  <Route path="sales-orders/new" element={<SalesOrderForm />} />
                </Route>
                <Route element={<ProtectedRoute permission="sales:update" />}>
                  <Route path="sales-orders/:id/edit" element={<SalesOrderForm />} />
                </Route>
              </Route>
              <Route element={<ProtectedRoute anyOf={[...SALES_ORDER_VIEW_KEYS, ...PRODUCTION_VIEW_KEYS]} />}>
                <Route path="sales-orders/:id" element={<SalesOrderDetail />} />
              </Route>
              <Route element={<ProtectedRoute permission="intake:read" />}>
                <Route path="draft-orders" element={<DraftOrders />} />
                <Route element={<ProtectedRoute permission="intake:settings" />}>
                  <Route path="draft-orders/setup" element={<DraftOrderSetup />} />
                </Route>
                <Route element={<ProtectedRoute permission="intake:update" />}>
                  <Route path="draft-orders/new" element={<DraftOrderForm />} />
                </Route>
                <Route path="draft-orders/:id" element={<DraftOrderDetail />} />
              </Route>
              <Route element={<ProtectedRoute permission="sales:read" />}>
                <Route path="sales-settings" element={<SalesSettings />} />
                <Route path="rate-calculator" element={<RateCalculator />} />
                <Route element={<ProtectedRoute permission="sales:create" />}>
                  <Route path="sales-settings/templates/new" element={<ProductTemplateForm />} />
                </Route>
                <Route path="sales-settings/templates/:id" element={<ProductTemplateForm />} />
                <Route path="customers" element={<Customers />} />
                <Route element={<ProtectedRoute permission="sales:create" />}>
                  <Route path="customers/new" element={<CustomerForm />} />
                </Route>
                <Route path="customers/:id" element={<CustomerForm />} />
              </Route>
              <Route path="production" element={<ToRegister />} />
              <Route element={<ProtectedRoute anyOf={[...SALES_ORDER_VIEW_KEYS, ...PRODUCTION_VIEW_KEYS]} />}>
                <Route path="registers" element={<Registers />} />
                <Route path="registers/:orderId" element={<OrderRegister />} />
              </Route>
              <Route element={<ProtectedRoute permission="tasks:read" />}>
                <Route path="tasks" element={<Tasks />} />
              </Route>
              <Route element={<ProtectedRoute permission="audit:read" />}>
                <Route path="audit-logs" element={<AuditLogs />} />
              </Route>
              <Route element={<ProtectedRoute anyOf={ANALYTICS_VIEW_KEYS} />}>
                <Route path="analytics" element={<Analytics />} />
              </Route>
              <Route element={<ProtectedRoute anyOf={['accounts:read', 'sales:read', 'production:read', 'dispatch:read', 'inventory:read']} />}>
                <Route path="reports" element={<Reports />} />
              </Route>
              <Route element={<ProtectedRoute permission="accounts:read" />}>
                <Route path="books" element={<Books />} />
                <Route path="purchases" element={<Purchases />} />
                <Route path="cash-bank" element={<CashBank />} />
                <Route path="statements" element={<Statements />} />
                <Route path="suppliers/:id/account" element={<SupplierAccount />} />
              </Route>
              {/* No role holds company:update, so only the owner gets here. */}
              <Route element={<ProtectedRoute permission="company:update" />}>
                <Route path="settings/form-fields" element={<FormFields />} />
              </Route>
              <Route element={<ProtectedRoute anyOf={['production:read', 'inventory:read']} />}>
                <Route path="stages" element={<Stages />} />
                <Route path="stages/:id" element={<StageDetail />} />
                <Route path="machines" element={<Machines />} />
                <Route element={<ProtectedRoute anyOf={['production:create', 'inventory:create']} />}>
                  <Route path="machines/new" element={<MachineForm />} />
                </Route>
                <Route path="machines/:id" element={<MachineForm />} />
              </Route>
              <Route path="company" element={<CompanySettings />} />
              <Route element={<ProtectedRoute anyOf={['accounts:read', 'sales:read']} />}>
                <Route path="customers/:id/account" element={<CustomerAccount />} />
                <Route path="receivables" element={<Receivables />} />
              </Route>
              <Route element={<ProtectedRoute permission="accounts:create" />}>
                <Route path="billing/openings-import" element={<OpeningImport />} />
              </Route>
              <Route element={<ProtectedRoute anyOf={['inventory:read', 'production:read', 'sales:read']} />}>
                <Route path="suppliers" element={<Suppliers />} />
                <Route element={<ProtectedRoute permission="inventory:create" />}>
                  <Route path="suppliers/new" element={<SupplierForm />} />
                </Route>
                <Route path="suppliers/:id" element={<SupplierForm />} />
              </Route>
              <Route element={<ProtectedRoute permission="inventory:read" />}>
                <Route path="inventory" element={<Inventory />} />
                <Route path="inventory/stages" element={<InventoryStages />} />
                <Route element={<ProtectedRoute permission="inventory:create" />}>
                  <Route path="inventory/new" element={<InventoryForm />} />
                </Route>
                <Route path="inventory/:id" element={<InventoryForm />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <ConfirmHost />
    </>
  );
}

// A data router (rather than <BrowserRouter>) so forms can block navigation
// while they have unsaved changes (useBlocker).
const router = createBrowserRouter([{ path: '*', element: <AppRoutes /> }]);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
