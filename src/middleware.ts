import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Admin-only routes
    if (pathname.startsWith('/dashboard/analytics') || pathname.startsWith('/api/admin')) {
      if (token?.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    // Instructor+ routes (quiz creation, session hosting)
    if (
      pathname.startsWith('/dashboard/quizzes/new') ||
      pathname.startsWith('/session') && pathname.includes('/host')
    ) {
      if (token?.role === 'STUDENT') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Public routes - always allowed
        if (
          pathname === '/' ||
          pathname.startsWith('/auth') ||
          pathname.startsWith('/join') ||
          pathname.startsWith('/api/auth') ||
          pathname.startsWith('/api/session/join')
        ) {
          return true;
        }

        // API routes require auth
        if (pathname.startsWith('/api')) {
          return !!token;
        }

        // Dashboard and play routes require auth
        if (pathname.startsWith('/dashboard') || pathname.startsWith('/play') || pathname.startsWith('/session')) {
          return !!token;
        }

        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/play/:path*',
    '/session/:path*',
    '/api/quiz/:path*',
    '/api/session/:path*',
    '/api/admin/:path*',
    '/api/analytics/:path*',
    '/api/code/:path*',
  ],
};
