import { NpyViewer } from "./components/NpyViewer/NpyViewer";
import { NpyViewerProvider } from "./context/NpyViewerContext";

function App() {
  return (
    <NpyViewerProvider>
      <div className="w-full h-full bg-white p-10">
        <NpyViewer />
      </div>
    </NpyViewerProvider>
  );
}

export default App;
