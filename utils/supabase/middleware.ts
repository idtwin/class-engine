import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname;
  const isProtectedRoute = path.startsWith('/dashboard') || 
                           path.startsWith('/teams') ||
                           path.startsWith('/story') ||
                           path.startsWith('/jeopardy') ||
                           path.startsWith('/hotseat') ||
                           path.startsWith('/odd-one-out') ||
                           path.startsWith('/rapid-fire') ||
                           path.startsWith('/reveal') ||
                           // /play is for students, /join is for students. We shouldn't protect them with teacher auth
                           path === '/'; // root redirects to dashboard anyway usually, or join. Let's protect root? No, we will let root be public if needed.

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // If path is /login and user is already logged in, redirect to dashboard
  if (user && path === '/login') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
  }

  return supabaseResponse
}
