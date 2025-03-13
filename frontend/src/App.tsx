import { Provider } from 'react-redux';
import { store } from './store';
import { GeometryManager } from './features/GeometryManager/GeometryManager';
import "./App.scss";

function App() {
  return (
    <Provider store={store}>
      <GeometryManager />
    </Provider>
  );
}

export default App;
