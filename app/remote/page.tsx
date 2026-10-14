export default function RemotePage({ searchParams }: any) {
  const code = searchParams?.code || "";

  return (
    <div style={{ background: '#000', color: '#ff6600', height: '100vh', padding: '20px', fontFamily: 'monospace', textAlign: 'center' }}>
      <h1 style={{ fontSize: '24px' }}>FORM_LINK_ACTIVE</h1>
      <p style={{ opacity: 0.7, marginBottom: '40px' }}>ZERO_JS_PROTOCOL</p>
      
      {!code ? (
        <form action="/remote" method="GET">
          <input 
            name="code"
            type="text" 
            placeholder="0000" 
            style={{ width: '100%', padding: '20px', background: '#111', border: '1px solid #ff6600', color: '#fff', fontSize: '32px', textAlign: 'center', marginBottom: '20px' }}
          />
          <button 
            type="submit"
            style={{ width: '100%', padding: '20px', background: '#ff6600', color: '#000', border: 'none', fontWeight: 'bold', fontSize: '20px' }}
          >
            ESTABLISH_LINK
          </button>
        </form>
      ) : (
        <div>
          <div style={{ border: '1px solid #ff6600', padding: '20px', marginBottom: '40px' }}>
            <div style={{ fontSize: '10px', opacity: 0.5 }}>ROOM_CODE</div>
            <div style={{ fontSize: '32px' }}>{code}</div>
          </div>

          <form action="/api/room/action" method="POST">
            <input type="hidden" name="code" value={code} />
            <input type="hidden" name="action" value="set_cargo" />
            <button 
              type="submit"
              style={{ width: '100%', padding: '30px', background: '#ff6600', color: '#000', border: 'none', fontWeight: 'bold', fontSize: '20px', marginBottom: '20px' }}
            >
              REROUTE_CARGO (FORM_POST)
            </button>
          </form>

          <a href="/remote" style={{ color: '#ff6600', fontSize: '12px' }}>DISCONNECT</a>
        </div>
      )}
    </div>
  );
}
