import "./globals.css";

export const metadata = {
title: "ArtisanAI | Your Craft, Your Market",
description:
"Help local artisans create AI-powered product listings in regional languages.",
};

export default function RootLayout({ children }) {
return ( <html lang="en"> <body>{children}</body> </html>
);
}
