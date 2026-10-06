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
import { customersAPI, garmentsAPI, ordersAPI, inventoryAPI, suppliersAPI, tailorsAPI } from '../services/api';
import CustomerForm from '../features/customers/CustomerForm';
import CustomerDetail from '../features/customers/CustomerDetail';
import MeasurementTemplatesPage from '../features/measurements/MeasurementTemplatesPage';

function PublicRoute({ children }) { const { user } = useAuthStore(); return user ? <Navigate to="/dashboard" replace /> : children; }

const configs = {
  garments: { title: 'Garments', api: garmentsAPI, fields: [{ name: 'name', label: 'Name', required: true }, { name: 'category', label: 'Category', type: 'select', required: true, options: ['shirt', 'pants', 'dress', 'suit', 'jacket', 'skirt', 'other'] }, { name: 'basePrice', label: 'Base price', type: 'number', number: true, required: true, min: 0 }, { name: 'estimatedDays', label: 'Estimated days', type: 'number', number: true, min: 1 }, { name: 'description', label: 'Description', type: 'textarea' }] },
  orders: { title: 'Orders', api: ordersAPI, fields: [{ name: 'customerId', label: 'Customer ID', required: true }, { name: 'totalAmount', label: 'Total amount', type: 'number', number: true, required: true, min: 0 }, { name: 'deliveryDate', label: 'Delivery date', type: 'date' }, { name: 'paymentMethod', label: 'Payment method', type: 'select', options: ['cash', 'card', 'online', 'check'] }, { name: 'notes', label: 'Notes', type: 'textarea' }] },
  inventory: { title: 'Inventory', api: inventoryAPI, fields: [{ name: 'name', label: 'Name', required: true }, { name: 'category', label: 'Category', type: 'select', required: true, options: ['fabric', 'thread', 'button', 'zipper', 'other'] }, { name: 'quantity', label: 'Quantity', type: 'number', number: true, required: true, min: 0 }, { name: 'unit', label: 'Unit', type: 'select', required: true, options: ['meter', 'piece', 'box', 'kg', 'liter'] }, { name: 'reorderLevel', label: 'Reorder level', type: 'number', number: true, min: 0 }, { name: 'unitPrice', label: 'Unit price', type: 'number', number: true, required: true, min: 0 }] },
  suppliers: { title: 'Suppliers', api: suppliersAPI, fields: [{ name: 'name', label: 'Name', required: true }, { name: 'phone', label: 'Phone', required: true }, { name: 'email', label: 'Email', type: 'email' }, { name: 'paymentTerms', label: 'Payment terms' }, { name: 'rating', label: 'Rating', type: 'number', number: true, min: 0, step: 0.1 }] },
  tailors: { title: 'Tailors', api: tailorsAPI, fields: [{ name: 'userId', label: 'User ID', required: true }, { name: 'experience', label: 'Experience years', type: 'number', number: true, min: 0 }, { name: 'specialization', label: 'Specialization' }] },
};

function Protected({ children }) { return <ProtectedRoute>{children}</ProtectedRoute>; }

export default function Router() {
  return <BrowserRouter><Routes>
    <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} /><Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
    <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
    <Route path="/customers" element={<Protected><ListPage title="Customers" API={customersAPI} createLink="/customers/new" detailPath="/customers" /></Protected>} />
    <Route path="/customers/new" element={<Protected><CustomerForm /></Protected>} /><Route path="/customers/:id/edit" element={<Protected><CustomerDetail /></Protected>} /><Route path="/customers/:id" element={<Protected><CustomerDetail /></Protected>} />
    <Route path="/measurements" element={<Protected><MeasurementTemplatesPage /></Protected>} />
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
