import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { ConfirmHost } from './components/ui/ConfirmHost';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { RoleDetail } from './pages/RoleDetail';
import { Roles } from './pages/Roles';
import { UserCreate } from './pages/UserCreate';
import { UserEdit } from './pages/UserEdit';
import { Users } from './pages/Users';
import { Inventory } from './pages/Inventory';
import { InventoryForm } from './pages/InventoryForm';
import { InventoryStages } from './pages/InventoryStages';
import { MachineForm } from './pages/MachineForm';
import { Machines } from './pages/Machines';
import { StageDetail } from './pages/StageDetail';
import { Stages } from './pages/Stages';
import { Customers } from './pages/Customers';
import { CustomerForm } from './pages/CustomerForm';
import { SalesOrders } from './pages/SalesOrders';
import { SalesOrderForm } from './pages/SalesOrderForm';
import { SalesOrderDetail } from './pages/SalesOrderDetail';
import { DraftOrders } from './pages/DraftOrders';
import { DraftOrderSetup } from './pages/DraftOrderSetup';
import { DraftOrderDetail } from './pages/DraftOrderDetail';
import { SalesSettings } from './pages/SalesSettings';
import { ProductTemplateForm } from './pages/ProductTemplateForm';
import { RateCalculator } from './pages/RateCalculator';
import { OrderRegister } from './pages/OrderRegister';
import { Registers } from './pages/Registers';
import { AuditLogs } from './pages/AuditLogs';
import { Analytics } from './pages/Analytics';
import { Tasks } from './pages/Tasks';
import { ANALYTICS_VIEW_KEYS, PRODUCTION_VIEW_KEYS, SALES_ORDER_VIEW_KEYS } from './lib/sales';

function ToRegister() {
  const { search } = useLocation();
  return <Navigate to={`/registers${search}`} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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
              <Route element={<ProtectedRoute permission="sales:create" />}>
                <Route path="draft-orders" element={<DraftOrders />} />
                <Route path="draft-orders/setup" element={<DraftOrderSetup />} />
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
        <ConfirmHost />
      </BrowserRouter>
    </AuthProvider>
  );
}
