import { NextResponse } from 'next/server';
import { jwtDecode } from 'jwt-decode';

export function middleware(request) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;
  
  // Define public paths that don't require authentication
  const isPublicPath = path === '/' || path === '/login' || path === '/internal-login';
  
  // Try to get token from cookies or request headers
  let token = request.cookies.get('token')?.value;
  
  // If no token in cookies, try Authorization header (for API routes)
  if (!token && request.headers.get('authorization')) {
    const authHeader = request.headers.get('authorization');
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  // If token exists, verify it's not expired
  let user = null;
  let isTokenValid = false;
  
  if (token) {
    try {
      // Decode the JWT token
      const decoded = jwtDecode(token);
      
      // Check if token is expired
      const currentTime = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp > currentTime) {
        isTokenValid = true;
        user = { 
          role: decoded.role,
          isCoordinator: decoded.isCoordinator || false
        };
      }
    } catch (error) {
      console.error('Token validation error:', error);
    }
  }

  // Redirect logic
  if (isPublicPath && isTokenValid) {
    // If user is on a public path but has a valid token, redirect to dashboard based on role
    if (user?.role === 'admin') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    } else if (user?.role === 'student') {
      return NextResponse.redirect(new URL('/student/dashboard', request.url));
    } else if (user?.role === 'coordinator') {
      return NextResponse.redirect(new URL('/coordinator/dashboard', request.url));
    } else if (user?.role === 'teacher') {
      // If teacher has coordinator flag, redirect to coordinator dashboard
      if (user?.isCoordinator) {
        return NextResponse.redirect(new URL('/coordinator/dashboard', request.url));
      } else {
        return NextResponse.redirect(new URL('/teacher/dashboard', request.url));
      }
    }
  }
  
  // If user is not on a public path and doesn't have a valid token, redirect to appropriate login
  if (!isPublicPath && !isTokenValid) {
    // Add the original URL as a query parameter so we can redirect back after login
    // Determine which login page to redirect to based on the path being accessed
    let loginUrl;
    
    if (path.startsWith('/admin') || path.startsWith('/teacher') || path.startsWith('/coordinator')) {
      // Redirect admin/teacher/coordinator paths to internal login
      loginUrl = new URL('/internal-login', request.url);
    } else {
      // Redirect student paths and other paths to regular login
      loginUrl = new URL('/login', request.url);
    }
    
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // For admin paths, check if user has admin role
  if (path.startsWith('/admin') && isTokenValid) {
    if (user?.role !== 'admin') {
      return NextResponse.redirect(new URL('/student/dashboard', request.url));
    }
  }
  
  // For student paths, check if user has student role
  if (path.startsWith('/student') && isTokenValid) {
    if (user?.role !== 'student') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
  }
  
  // For teacher paths, check if user has teacher role
  if (path.startsWith('/teacher') && isTokenValid) {
    if (user?.role !== 'teacher') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
  }
  
  // For coordinator paths, check if user has coordinator role or is a teacher with coordinator flag
  if (path.startsWith('/coordinator') && isTokenValid) {
    if (user?.role !== 'coordinator' && !(user?.role === 'teacher' && user?.isCoordinator)) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
  }
  
  return NextResponse.next();
}

// Define which paths this middleware should run on
export const config = {
  matcher: [
    '/',
    '/login',
    '/internal-login',
    '/admin/:path*',
    '/student/:path*',
    '/teacher/:path*',
    '/coordinator/:path*'
  ]
}; 