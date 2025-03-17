import { Provider } from 'react-redux';
import { store } from './store';
// import { DataManger } from './features/DataManger/DataManger';
import Dashboard from './page/dashboard/dashboard';
import "./App.scss";

function App() {
  return (
    <Provider store={store}>
      {/* <DataManger /> */}
      <Dashboard/>
    </Provider>
  );
}

export default App;
