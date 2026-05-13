import "./App.css";
import { useSocket } from "./hooks/useSocket";

function App() {
  const { socket, connected } = useSocket();

  return (
    <main>
      {`this is socket io client test:${connected}`}
      <h1>{socket.id}</h1>
    </main>
  );
}

export default App;
