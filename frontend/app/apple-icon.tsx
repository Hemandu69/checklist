import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #f0cd94 0%, #d7a75f 45%, #a9702f 100%)",
        }}
      >
        <svg width="108" height="108" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 13l5 5L20 6"
            stroke="#1c1408"
            strokeWidth="3.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
