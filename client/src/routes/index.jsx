import { createBrowserRouter } from "react-router-dom";
import App from "../App";
import { ProtectedRoute, PublicRoute } from "../protectedRouter/ProtectedRoute";
import Login from "../pages/userLogin/Login";
import Home from "../components/Home";
import Status from "../pages/statusSection/Status";
import UserDetails from "../components/UserDetails";
import Setting from "../pages/settingSection/Setting";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        element: <ProtectedRoute />,
        children: [
          { path: "", element: <Home /> },
          { path: "user-profile", element: <UserDetails /> },
          { path: "status", element: <Status /> },
          { path: "setting", element: <Setting /> },
        ],
      },
      {
        element: <PublicRoute />,
        children: [
          { path: "user-login", element: <Login /> },
          /* { path: "signup", element: <Signup /> }, */
        ],
      },
    ],
  },
]);

export default router;
