import React from "react";
import { Outlet } from "react-router-dom";
import { Toaster } from "react-hot-toast";

const App = () => {
  return (
    <>
      <Outlet />
      <Toaster reverseOrder={false} />
    </>
  );
};

export default App;
