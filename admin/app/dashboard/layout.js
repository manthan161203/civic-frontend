import Sidebar from '../../src/components/layout/Sidebar.js';
import Header from '../../src/components/layout/Header.js';
import GoogleMapProvider from '../../src/components/ui/GoogleMapProvider.js';

export default function DashboardLayout({ children }) {
  return (
    <GoogleMapProvider>
      <div className="flex h-full">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </GoogleMapProvider>
  );
}
