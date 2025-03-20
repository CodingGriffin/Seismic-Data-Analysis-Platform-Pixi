import { Provider } from 'react-redux';
import { store } from './store';
import Dashboard from './page/dashboard/dashboard';
import { Toast } from './components/Toast/Toast';
import "./App.scss";

function App() {
  return (
    <Provider store={store}>
      <Toast />
      <Dashboard/>
    </Provider>
  );
}

export default App;
