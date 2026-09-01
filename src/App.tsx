import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { AppBootstrap } from './AppBootstrap';
import { AppRoutes } from './AppRoutes';
import { NotificationProvider } from './components/notification/Notification/NotificationProvider';
import { store } from './store';

export function App() {
  return (
    <Provider store={store}>
      <NotificationProvider>
        <AppBootstrap>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AppBootstrap>
      </NotificationProvider>
    </Provider>
  );
}
