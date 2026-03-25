import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { WhiteboardProvider } from "./context/WhiteboardContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <WhiteboardProvider>
        <App />
      </WhiteboardProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

