import { createBrowserRouter } from 'react-router-dom';
import App from '../App';
import LandingPage from '../pages/LandingPage';
import Dashboard from '../pages/DashboardPage';
import Generator from '../pages/GeneratorPage';
import ProblemOutput from '../pages/OutputPage';
import Account from '../pages/AccountPage';
import SituationalGenerator from '../pages/SituationalGeneratorPage';
// import ErrorPage from '../pages/ErrorPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <App />,
    children: [
      {
        path: '/',
        element: <LandingPage />,
      },
      {
        path: '/dashboard',
        element: <Dashboard />,
        // errorElement: <ErrorPage />,
      },
      {
        path: '/generate',
        element: <Generator />,
        // errorElement: <ErrorPage />,
      },
      {
        path: '/generate-situational',
        element: <SituationalGenerator />,
        // errorElement: <ErrorPage />,
      },
      {
        path: '/results',
        element: <ProblemOutput />,
        // errorElement: <ErrorPage />,
      },
      {
        path: '/account',
        element: <Account />,
        // errorElement: <ErrorPage />,
      },
    ],
  },
]);

export default router;
