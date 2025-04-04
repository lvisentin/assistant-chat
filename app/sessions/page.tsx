import dynamic from 'next/dynamic';
import Link from 'next/link';

// Use dynamic import to avoid hydration errors with client-side code
const SessionManager = dynamic(() => import('../components/SessionManager'), { ssr: false });

export default function SessionsPage() {
  return (
    <div className="container mx-auto py-10 px-4">
      <div className="mb-6">
        <Link 
          href="/chat"
          className="text-blue-500 hover:text-blue-700 flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Chat
        </Link>
      </div>
      
      <h1 className="text-2xl font-bold mb-6 text-center">Manage Chat Sessions</h1>
      <SessionManager />
    </div>
  );
} 