import "./App.css";
import { Topbar } from "./components/Topbar.tsx";
import { Home } from "./pages/Home.tsx";

function App() {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <Topbar />
      <Home />
    </div>
  );
}

export default App;
