import { Provider } from 'react-redux';
import { store } from './store';
import { DataManger } from './features/DataManger/DataManger';
import "./App.scss";

function App() {
  return (
    <Provider store={store}>
      <DataManger />
    </Provider>
  );
}

export default App;
