import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

export const useSocket = () => {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // create socket connection:
    socketRef.current = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
    });
    //connection event
    socketRef.current.on("connect", () => {
      setConnected(true);
      console.log("Connected to Server", socketRef.current.id);
    });
    //disconnected event
    socketRef.current.on("disconnect", () => {
      setConnected(false);
      console.log("disconnected from server");
    });

    socketRef.current.on("connected", (data) => {
      console.log("Server Message:", data.mess);
    });

    // clean up /unmount:

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  return {
    // eslint-disable-next-line react-hooks/refs
    socket: socketRef.current,
    connected,
  };
};
