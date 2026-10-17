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
