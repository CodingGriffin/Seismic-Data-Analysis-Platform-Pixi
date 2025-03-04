import { NpyViewer } from './components/NpyViewer/NpyViewer';
import { NpyViewerProvider } from './context/NpyViewerContext';

function App() {
  return (
    <NpyViewerProvider>
      <div className="w-full min-h-screen bg-white p-8">
        <div className="w-full max-w-6xl mx-auto">
          <NpyViewer />
        </div>
      </div>
    </NpyViewerProvider>
  );
}

export default App;
