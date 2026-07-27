import './global.css';

export const metadata = {
  title: 'Graphics i18n',
  description: 'Editor',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
