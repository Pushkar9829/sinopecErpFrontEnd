import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
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
import { SalesSettings } from './pages/SalesSettings';
import { ProductTemplateForm } from './pages/ProductTemplateForm';
import { ProductionFloor } from './pages/ProductionFloor';
import { Analytics } from './pages/Analytics';
import { ANALYTICS_VIEW_KEYS, PRODUCTION_VIEW_KEYS, SALES_ORDER_VIEW_KEYS } from './lib/sales';

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
                <Route path="sales-orders/:id" element={<SalesOrderDetail />} />
              </Route>
              <Route element={<ProtectedRoute permission="sales:read" />}>
                <Route path="sales-settings" element={<SalesSettings />} />
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
              <Route element={<ProtectedRoute anyOf={PRODUCTION_VIEW_KEYS} />}>
                <Route path="production" element={<ProductionFloor />} />
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
      </BrowserRouter>
    </AuthProvider>
  );
}
