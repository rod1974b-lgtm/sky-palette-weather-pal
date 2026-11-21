// src/routes/gallery.tsx - MINIMAL TEST VERSION - TEMPORARY
// Use this ONLY to unblock the "Couldn't update the preview" error.
// This file has NO risky imports. If this updates, the problem was the big gallery file.
// If this also fails, the problem is Lovable, not the code.
// After this works, put the full gallery back.
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/gallery")({
  component: GalleryTest,
});

function GalleryTest() {
  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <h1>Gallery Test - It Updated!</h1>
      <p>If you see this, Lovable CAN update the gallery page.</p>
      <p>Put the full gallery file back now.</p>
      <Link to="/" style={{ color: "blue", textDecoration: "underline" }}>
        Back to Forecast
      </Link>
    </div>
  );
}
