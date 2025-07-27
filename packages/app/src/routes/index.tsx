import { Button } from "@/components/ui/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { getHealth } from "@/lib/api";
import { useState } from "react";

export const Route = createFileRoute("/")({
  component: App,
});

function App() {
  const [health, setHealth] = useState("");
  const handleHealth = async () => {
    const res = await getHealth();
    setHealth(res);
  };

  return (
    <div className="text-center">
      <Link to="/login">Login</Link>
      <Button onClick={handleHealth}>Health</Button>
      <span>{health}</span>
    </div>
  );
}
