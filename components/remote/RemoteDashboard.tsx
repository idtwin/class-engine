"use client";

import { useState } from "react";

export default function RemoteDashboard() {
  const [clicked, setClicked] = useState(false);

  return (
    <div style={{ 
      background: '#000', 
      color: '#ff6600', 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      fontFamily: 'monospace',
      padding: '20px',
      textAlign: 'center'
    }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>SKELETON_LINK_ACTIVE</h1>
      <p style={{ opacity: 0.7, marginBottom: '40px' }}>IF_YOU_SEE_THIS_THE_JS_ENGINE_IS_ALIVE</p>
      
      <button 
        onClick={() => {
          setClicked(true);
          alert("SKELETON_TAPPED");
        }}
        style={{ 
          padding: '30px 60px', 
          background: '#ff6600', 
          color: '#000', 
          border: 'none', 
          fontSize: '20px', 
          fontWeight: 'bold',
          borderRadius: '8px'
        }}
      >
        {clicked ? "SIGNAL_CONFIRMED" : "TEST_SIGNAL"}
      </button>
    </div>
  );
}
