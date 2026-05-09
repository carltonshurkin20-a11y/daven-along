 'use client';
import { useEffect, useRef, useState } from 'react';

export default function Home() {
  return (
    <main style={{
      background: '#0d0a06',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '16px',
    }}>
      <h1 style={{
        fontFamily: 'serif',
        color: '#c8a84b',
        fontSize: '3rem',
      }}>
        ✡ Daven Along
      </h1>
      <p style={{ color: '#6a6050', fontFamily: 'sans-serif' }}>
        App is running successfully!
      </p>
    </main>
  );
}