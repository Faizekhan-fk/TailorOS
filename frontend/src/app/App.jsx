import Router from './router'
import AuthSessionBootstrap from '../features/auth/AuthSessionBootstrap';

export default function App() {
  return <>
    <AuthSessionBootstrap />
    <Router />
  </>
}
