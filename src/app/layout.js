import "./globals.css";

export const metadata = {
  title: "Leaflet GIS App",
  description: "Geographic Information System with Leaflet",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
