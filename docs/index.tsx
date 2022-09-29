import { createRoot } from "react-dom/client";
import React from "react";
import { Provider } from "./Provider";
import { Entities } from "./Entities";

const rootElement = document.getElementById("root");
const root = createRoot(rootElement!);

root.render(
  <React.StrictMode>
    <Provider>
      <Entities />
    </Provider>
  </React.StrictMode>
);
