'use client';
import dynamic from 'next/dynamic';

const App = dynamic(() => import('./App'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#888', fontFamily: 'system-ui' }}>
      Loading DouletAI...
    </div>
  ),
});

export default function ClientApp() {
  return <App />;
}
