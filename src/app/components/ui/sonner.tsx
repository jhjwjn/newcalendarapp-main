"use client";

import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      position="bottom-center"
      offset="120px"
      closeButton
      richColors
      className="toaster group"
      toastOptions={{
        style: {
          zIndex: 99999,
        },
      }}
      style={
        {
          "--normal-bg": "rgba(255,255,255,0.94)",
          "--normal-text": "#0f172a",
          "--normal-border": "rgba(148,163,184,0.22)",
          bottom: "120px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 99999,
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
