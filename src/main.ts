import { expose } from "synclink";
import "./style.css";
import WorkerConstructor from "./worker/worker?worker";

const worker = new WorkerConstructor({ name: "pyodide-worker" });

worker.addEventListener(
  "message",
  (e: MessageEvent<MessagePort>) => {
    const port = e.data;
    port.addEventListener("message", (e) => {
      if (Array.isArray(e.data)) {
        console.log(...e.data);
      } else {
        console.log(e.data);
      }
    });

    expose(
      {
        async read() {
          return "hifehwafoi";
        },
      },
      port,
    );

    worker.addEventListener("message", (e) => console.log(e.data));
  },
  { once: true },
);
