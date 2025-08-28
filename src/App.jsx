import React from 'react'
import SwiftieGame from './components/SwiftieGame'

export default function App(){
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white flex items-center justify-center p-6">
      <div className="w-full max-w-5xl">
        <SwiftieGame />
      </div>
    </div>
  )
}
