import { TooltipProvider } from '@/components/ui/tooltip';
import './global.css';

export const metadata = {
  title: 'i18n graphics',
  description: 'Localized graphics packages for web and React Native',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
