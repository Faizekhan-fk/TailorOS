import { Fragment } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../features/auth/auth.store';
import LoginPage from '../features/auth/LoginPage';
import RegisterPage from '../features/auth/RegisterPage';
import ProtectedRoute from '../features/auth/ProtectedRoute';
import Dashboard from '../pages/Dashboard';
import ListPage from '../pages/ListPage';
import ResourceForm from '../pages/ResourceForm';
import ResourceDetail from '../pages/ResourceDetail';
import { garmentsAPI, ordersAPI, inventoryAPI, suppliersAPI, tailorsAPI } from '../services/api';
import CustomerDetail from '../features/customers/CustomerDetail';
import CustomersPage from '../features/customers/CustomersPage';
import CustomerFormPage from '../features/customers/CustomerFormPage';
import MeasurementTemplatesPage from '../features/measurements/MeasurementTemplatesPage';
import ShopContextSelector from '../features/shops/ShopContextSelector';
import PaymentsPage from '../features/payments/PaymentsPage';
import PaymentFormPage from '../features/payments/PaymentFormPage';
import PaymentReceiptPage from '../features/payments/PaymentReceiptPage';
import ProductionPage from '../features/production/ProductionPage';
import {
  AnalyticsPage, AuditLogsPage, ExpensesPage, InvoicesPage, NotificationsPage,
  PortalAccountsPage, PurchasesPage, ReportsPage,
} from '../features/operations/OperationsPages';
import { CustomerPortalHome, CustomerPortalLogin } from '../features/portal/CustomerPortalPages';
import WhatsAppPage from '../features/integrations/WhatsAppPage';
import BarcodesPage from '../features/integrations/BarcodesPage';
import { hasPermission } from '../features/auth/permissions';

function PublicRoute({ children }) { const { user } = useAuthStore(); return user ? <Navigate to="/dashboard" replace /> : children; }

const configs = {
  garments: { title: 'Garments', api: garmentsAPI, fields: [{ name: 'name', label: 'Name', required: true }, { name: 'category', label: 'Category', type: 'select', required: true, options: ['shirt', 'pants', 'dress', 'suit', 'jacket', 'skirt', 'other'] }, { name: 'basePrice', label: 'Base price', type: 'number', number: true, required: true, min: 0 }, { name: 'estimatedDays', label: 'Estimated days', type: 'number', number: true, min: 1 }, { name: 'description', label: 'Description', type: 'textarea' }] },
  orders: { title: 'Orders', api: ordersAPI, fields: [{ name: 'customerId', label: 'Customer ID', required: true }, { name: 'totalAmount', label: 'Total amount', type: 'number', number: true, required: true, min: 0 }, { name: 'deliveryDate', label: 'Delivery date', type: 'date' }, { name: 'paymentMethod', label: 'Payment method', type: 'select', options: ['cash', 'card', 'online', 'check'] }, { name: 'notes', label: 'Notes', type: 'textarea' }] },
  inventory: { title: 'Inventory', api: inventoryAPI, fields: [{ name: 'name', label: 'Name', required: true }, { name: 'category', label: 'Category', type: 'select', required: true, options: ['fabric', 'thread', 'button', 'zipper', 'other'] }, { name: 'quantity', label: 'Quantity', type: 'number', number: true, required: true, min: 0 }, { name: 'unit', label: 'Unit', type: 'select', required: true, options: ['meter', 'piece', 'box', 'kg', 'liter'] }, { name: 'reorderLevel', label: 'Reorder level', type: 'number', number: true, min: 0 }, { name: 'unitPrice', label: 'Unit price', type: 'number', number: true, required: true, min: 0 }] },
  suppliers: { title: 'Suppliers', api: suppliersAPI, fields: [{ name: 'name', label: 'Name', required: true }, { name: 'phone', label: 'Phone', required: true }, { name: 'email', label: 'Email', type: 'email' }, { name: 'paymentTerms', label: 'Payment terms' }, { name: 'rating', label: 'Rating', type: 'number', number: true, min: 0, step: 0.1 }] },
  tailors: { title: 'Tailors', api: tailorsAPI, fields: [{ name: 'userId', label: 'User ID', required: true }, { name: 'experience', label: 'Experience years', type: 'number', number: true, min: 0 }, { name: 'specialization', label: 'Specialization' }] },
};

function Protected({ children }) { return <ProtectedRoute>{children}</ProtectedRoute>; }
function PermissionPage({ permission, children }) {
  const user = useAuthStore((state) => state.user);
  return hasPermission(user, permission)
    ? children
    : <main className="commerce-page"><div className="commerce-alert" role="alert">You do not have permission to view this page.</div></main>;
}
function CustomerPortalProtected({ children }) {
  return localStorage.getItem('portalAccessToken')
    ? children
    : <Navigate to="/portal/login" replace />;
}

export default function Router() {
  return <BrowserRouter><ShopContextSelector /><Routes>
    <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} /><Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
    <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
    <Route path="/customers" element={<Protected><CustomersPage /></Protected>} />
    <Route path="/customers/new" element={<Protected><CustomerFormPage mode="create" /></Protected>} />
    <Route path="/customers/:id/edit" element={<Protected><CustomerFormPage mode="edit" /></Protected>} />
    <Route path="/customers/:id" element={<Protected><CustomerDetail /></Protected>} />
    <Route path="/measurements" element={<Protected><MeasurementTemplatesPage /></Protected>} />
    <Route path="/payments" element={<Protected><PaymentsPage /></Protected>} />
    <Route path="/payments/new" element={<Protected><PaymentFormPage /></Protected>} />
    <Route path="/payments/:id" element={<Protected><PaymentReceiptPage /></Protected>} />
    <Route path="/production" element={<Protected><ProductionPage /></Protected>} />
    <Route path="/purchases" element={<Protected><PermissionPage permission="purchases.view"><PurchasesPage /></PermissionPage></Protected>} />
    <Route path="/expenses" element={<Protected><PermissionPage permission="expenses.view"><ExpensesPage /></PermissionPage></Protected>} />
    <Route path="/invoices" element={<Protected><PermissionPage permission="invoices.view"><InvoicesPage /></PermissionPage></Protected>} />
    <Route path="/invoices/:id" element={<Protected><PermissionPage permission="invoices.view"><InvoicesPage /></PermissionPage></Protected>} />
    <Route path="/notifications" element={<Protected><PermissionPage permission="notifications.view"><NotificationsPage /></PermissionPage></Protected>} />
    <Route path="/reports" element={<Protected><PermissionPage permission="reports.view"><ReportsPage /></PermissionPage></Protected>} />
    <Route path="/analytics" element={<Protected><PermissionPage permission="analytics.view"><AnalyticsPage /></PermissionPage></Protected>} />
    <Route path="/audit-logs" element={<Protected><PermissionPage permission="audit_logs.view"><AuditLogsPage /></PermissionPage></Protected>} />
    <Route path="/portal/accounts" element={<Protected><PermissionPage permission="customer_portal.view"><PortalAccountsPage /></PermissionPage></Protected>} />
    <Route path="/whatsapp" element={<Protected><PermissionPage permission="whatsapp.view"><WhatsAppPage /></PermissionPage></Protected>} />
    <Route path="/barcodes" element={<Protected><PermissionPage permission="barcodes.view"><BarcodesPage /></PermissionPage></Protected>} />
    <Route path="/portal/login" element={<CustomerPortalLogin />} />
    <Route path="/portal" element={<CustomerPortalProtected><CustomerPortalHome /></CustomerPortalProtected>} />
    {Object.keys(configs).map((kind) => <Route key={kind} path={`/${kind}`} element={<Protected><ListPage title={configs[kind].title} API={configs[kind].api} createLink={`/${kind}/new`} detailPath={`/${kind}`} /></Protected>} />)}
    {Object.keys(configs).map((kind) => {
      const config = configs[kind];
      const path = `/${kind}`;
      return (
        <Fragment key={kind}>
          <Route path={`${path}/new`} element={<Protected><ResourceForm title={config.title} api={config.api} fields={config.fields} redirectPath={path} /></Protected>} />
          <Route path={`${path}/:id`} element={<Protected><ResourceDetail title={config.title} api={config.api} getItem={config.api.getById} fields={config.fields} listPath={path} /></Protected>} />
        </Fragment>
      );
    })}
    <Route path="/" element={<Navigate to="/dashboard" replace />} /><Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes></BrowserRouter>;
}
