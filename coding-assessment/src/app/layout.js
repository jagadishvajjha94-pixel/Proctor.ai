import './globals.css';

export const metadata = {
  title: 'Coding Assessment',
  description: 'Internal coding assessment platform',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
