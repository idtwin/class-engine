import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('[MIDDLEWARE] Missing Supabase environment variables');
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const path = request.nextUrl.pathname;
  const isProtectedRoute = path.startsWith('/dashboard') || 
                           path.startsWith('/teams') ||
                           path.startsWith('/story') ||
                           path.startsWith('/jeopardy') ||
                           path.startsWith('/hotseat') ||
                           path.startsWith('/odd-one-out') ||
                           path.startsWith('/rapid-fire') ||
                           path.startsWith('/reveal') ||
                           path === '/';

  // Only call getUser() if we are actually checking a protected route.
  // This prevents 'fetch failed' errors on the Edge runtime for student-facing routes.
  if (isProtectedRoute || path === '/login') {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user && isProtectedRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    if (user && path === '/login') {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
