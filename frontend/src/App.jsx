import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home     from "./pages/Home";
import Login    from "./pages/Login";
import Consent  from "./pages/Consent";
import Callback from "./pages/Callback";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"         element={<Home />} />
        <Route path="/login"    element={<Login />} />
        <Route path="/consent"  element={<Consent />} />
        <Route path="/callback" element={<Callback />} />
      </Routes>
    </BrowserRouter>
  );
}
