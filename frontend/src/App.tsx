import { useEffect, useState } from "react";
import axios from "axios";

function App() {
  const [serverMessage, setServerMessage] = useState("Loading...");

  useEffect(() => {
    axios
      .get("http://localhost:8000/api/health/")
      .then((response) => {
        setServerMessage(response.data.message);
      })
      .catch((error) => {
        console.error("There was an error fetching the API", error);
        setServerMessage("Failed to connect to backend.");
      });
  }, []);

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Edu RAG Monorepo</h1>
      <p>
        API Status: <strong>{serverMessage}</strong>
      </p>
    </div>
  );
}

export default App;