import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

const DPI = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
const W = 900
const H = 560

function rand(min, max){ return Math.random() * (max - min) + min }
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)) }

const ERAS = ["Fearless","Red","1989","Reputation","Lover","Folklore","Evermore","Midnights"]

export default function SwiftieGame(){
  const canvasRef = useRef(null)
  const rafRef = useRef(0)
  const keys = useRef({ left: false, right: false })
  const [running, setRunning] = useState(false)
  const [hud, setHud] = useState({ score: 0, lives: 3, level: 1, era: ERAS[0], proposal: 0 })
  const [gameOver, setGameOver] = useState(false)
  const [proposalMoment, setProposalMoment] = useState(false)
  const [touchDir, setTouchDir] = useState(0)

  const player = useRef({ x: W/2, y: H - 70, w: 90, h: 18, speed: 6, glow: 0 })
  const drops = useRef([])
  const particles = useRef([])

  function spawnDrop(level){
    const types = [
      { t: 'ring', char: '💍', score: 10, r: 16 },
      { t: 'heart', char: '💖', score: 5, r: 14 },
      { t: 'star', char: '✨', score: 15, r: 15 },
      { t: 'pap', char: '📸', dmg: 1, r: 16 },
    ]
    const bias = Math.random()
    let def
    if (bias < 0.55) def = types[bias < 0.35 ? 1 : 0]
    else if (bias < 0.8) def = types[2]
    else def = types[3]
    const fall = rand(2, 3.5) + level * 0.2
    drops.current.push({ ...def, x: rand(24, W - 24), y: -30, vy: fall, rot: rand(-0.03,0.03), a:1 })
  }

  function addConfetti(x,y,n=18){
    for(let i=0;i<n;i++){
      particles.current.push({ x,y, vx: rand(-2,2), vy: rand(-4,-1), g: 0.12, life: rand(40,90), char: ['🩵','💗','⭐','💎'][Math.floor(rand(0,4))] })
    }
  }

  // Input handlers
  useEffect(()=>{
    function down(e){
      if(["ArrowLeft","a","A"].includes(e.key)) keys.current.left = true
      if(["ArrowRight","d","D"].includes(e.key)) keys.current.right = true
      if(e.code === 'Space'){
        setRunning(r=>!r)
        if(gameOver) reset()
      }
    }
    function up(e){
      if(["ArrowLeft","a","A"].includes(e.key)) keys.current.left = false
      if(["ArrowRight","d","D"].includes(e.key)) keys.current.right = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return ()=>{ window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [gameOver])

  // DPI resize
  useEffect(()=>{
    const c = canvasRef.current; if(!c) return
    c.width = W * DPI; c.height = H * DPI; c.style.width = W + 'px'; c.style.height = H + 'px'
    const ctx = c.getContext('2d')
    ctx.setTransform(DPI,0,0,DPI,0,0)
  }, [])

  function reset(){
    setHud({ score: 0, lives: 3, level: 1, era: ERAS[0], proposal: 0 })
    player.current.x = W/2; player.current.glow = 0
    drops.current = []; particles.current = []
    setGameOver(false); setProposalMoment(false)
  }

  // Safe rounded-rect helper (works across browsers)
  function roundRectPath(ctx,x,y,w,h,r){
    const radius = Math.min(r, w/2, h/2)
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + w - radius, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
    ctx.lineTo(x + w, y + h - radius)
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
    ctx.lineTo(x + radius, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
  }

  function glass(ctx,x,y,w,h,r=16,alpha=0.8){
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.fillStyle = 'white'
    roundRectPath(ctx,x,y,w,h,r)
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.strokeStyle = 'rgba(56,182,255,0.25)'
    ctx.lineWidth = 2
    roundRectPath(ctx,x,y,w,h,r)
    ctx.stroke()

    // top highlight
    const g = ctx.createLinearGradient(0,y,0,y+h)
    g.addColorStop(0,'rgba(255,255,255,0.6)')
    g.addColorStop(1,'rgba(255,255,255,0)')
    ctx.fillStyle = g
    roundRectPath(ctx,x+2,y+2,w-4,Math.max(6,h*0.35),r*0.6)
    ctx.fill()
    ctx.restore()
  }

  useEffect(()=>{
    const c = canvasRef.current; if(!c) return
    const ctx = c.getContext('2d')
    let t = 0; let spawnTimer = 0

    function step(){
      rafRef.current = requestAnimationFrame(step)
      ctx.clearRect(0,0,W,H)

      // Background gradient
      const g = ctx.createLinearGradient(0,0,0,H)
      g.addColorStop(0,'rgba(56,182,255,0.25)')
      g.addColorStop(0.5,'rgba(147,197,253,0.15)')
      g.addColorStop(1,'rgba(255,255,255,0.95)')
      ctx.fillStyle = g; ctx.fillRect(0,0,W,H)

      // Stage lights
      for(let i=0;i<3;i++){
        ctx.beginPath()
        ctx.fillStyle = `rgba(56,182,255,${0.08 + 0.04*Math.sin(t*0.02 + i)})`
        ctx.ellipse(160 + i*260, 90, 120, 40, 0, 0, Math.PI*2)
        ctx.fill()
      }

      // Spawning
      if (running && !gameOver && !proposalMoment){
        spawnTimer -= 1
        if (spawnTimer <= 0){
          const rate = Math.max(16, 36 - hud.level*2)
          spawnDrop(hud.level)
          spawnTimer = rate
        }
      }

      // Player movement
      const p = player.current
      let dir = 0
      if (keys.current.left) dir -= 1
      if (keys.current.right) dir += 1
      if (touchDir) dir += touchDir
      p.x = clamp(p.x + dir * p.speed, 50, W - 50)

      // Draw player (guitar case)
      p.glow = Math.max(0, p.glow - 0.02)
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.fillStyle = `rgba(56,182,255,${0.35 + p.glow})`
      ctx.shadowColor = 'rgba(56,182,255,0.9)'
      ctx.shadowBlur = 18
      roundRectPath(ctx, -60, -14, 120, 28, 14)
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.font = '20px system-ui'
      ctx.fillStyle = '#0f172a'
      ctx.textAlign = 'center'
      ctx.fillText('🎸', 0, 6)
      ctx.restore()

      // Drops
      for (let i = drops.current.length - 1; i >= 0; i--){
        const d = drops.current[i]
        d.y += d.vy; d.rot += 0.01
        ctx.save()
        ctx.translate(d.x, d.y)
        ctx.rotate(d.rot)
        ctx.font = '24px system-ui'
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(d.char, 0, 0)
        ctx.restore()

        // Collision
        if (!proposalMoment && Math.abs(d.x - p.x) < 60 && Math.abs(d.y - p.y) < 24){
          if (d.t === 'pap'){
            setHud(h => ({ ...h, lives: h.lives - 1 }))
            addConfetti(p.x, p.y - 10, 6)
          } else {
            setHud(h => {
              const score = h.score + (d.score || 0)
              const proposal = Math.min(100, h.proposal + (d.score || 0) * 0.6)
              let level = h.level
              if (score >= h.level * 120) level += 1
              const era = ERAS[(level - 1) % ERAS.length]
              return { ...h, score, proposal, level, era }
            })
            addConfetti(d.x, d.y)
            p.glow = 0.25
          }
          drops.current.splice(i,1)
          continue
        }
        if (d.y > H + 40) drops.current.splice(i,1)
      }

      // Particles
      for (let i = particles.current.length - 1; i >= 0; i--){
        const q = particles.current[i]
        q.vy += q.g; q.x += q.vx; q.y += q.vy; q.life -= 1
        ctx.font = '18px system-ui'
        ctx.fillText(q.char, q.x, q.y)
        if (q.life <= 0) particles.current.splice(i,1)
      }

      // HUD & states
      if (hud.lives <= 0 && !gameOver){ setGameOver(true); setRunning(false) }
      if (hud.proposal >= 100 && !proposalMoment){
        setProposalMoment(true); setRunning(false)
        for (let k=0;k<28;k++) addConfetti(W/2 + rand(-80,80), 160 + rand(-40,40))
      }

      drawHUD(ctx)
      if (!running && !gameOver && !proposalMoment) drawBanner(ctx, 'Press Space or Tap ▶ to Start', 0.7)
      if (gameOver) drawBanner(ctx, 'Game Over — Press Space to Retry', 0.9)
      if (proposalMoment) drawProposal(ctx)

      t++
    }

    rafRef.current = requestAnimationFrame(step)
    return ()=> cancelAnimationFrame(rafRef.current)
  }, [running, hud.lives, hud.proposal, gameOver, proposalMoment, touchDir])

  function drawHUD(ctx){
    ctx.save()
    const cards = [ { label: 'Score', value: hud.score }, { label: 'Lives', value: '❤'.repeat(Math.max(0,hud.lives)) || '—' }, { label: 'Era', value: hud.era } ]
    cards.forEach((c,i)=>{
      glass(ctx, 16 + i*180, 14, 168, 56, 16)
      ctx.fillStyle = '#0f172a'
      ctx.font = '12px system-ui'
      ctx.fillText(c.label, 30 + i*180, 34)
      ctx.font = '20px system-ui'
      ctx.fillText(String(c.value), 30 + i*180, 60)
    })

    // Proposal meter
    glass(ctx, W - 250, 14, 220, 56, 16)
    ctx.fillStyle = '#0f172a'
    ctx.font = '12px system-ui'
    ctx.fillText('Proposal Meter', W - 236, 34)

    // bar background
    roundRectPath(ctx, W - 236, 42, 188, 12, 6)
    ctx.lineWidth = 2
    ctx.strokeStyle = 'rgba(15,23,42,0.12)'
    ctx.stroke()
    ctx.fillStyle = 'rgba(56,182,255,0.7)'
    const width = 188 * (hud.proposal/100)
    roundRectPath(ctx, W - 236, 42, width, 12, 6)
    ctx.fill()

    ctx.font = '16px system-ui'
    ctx.fillText('💍', W - 36, 58)
    ctx.restore()
  }

  function drawBanner(ctx, text, opacity=0.8){
    ctx.save()
    glass(ctx, W/2 - 260, H/2 - 44, 520, 90, 20, opacity)
    ctx.fillStyle = '#0f172a'
    ctx.font = '22px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText(text, W/2, H/2 + 8)
    ctx.restore()
  }

  function drawProposal(ctx){
    drawBanner(ctx, 'Will you be my forever? 💙', 0.92)
    ctx.save()
    ctx.translate(W/2, 180)
    for (let r=0;r<6;r++){
      ctx.beginPath()
      ctx.arc(0, 0, 38 + r*10, 0, Math.PI*2)
      ctx.strokeStyle = `rgba(56,182,255,${0.25 - r*0.03})`
      ctx.lineWidth = 6 - r*0.8; ctx.stroke()
    }
    ctx.font = '48px system-ui'
    ctx.fillText('💍', 0, 14)
    ctx.restore()
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white flex flex-col items-center justify-start py-10 px-4">
      <header className="w-full max-w-5xl mb-6">
        <div className="backdrop-blur-xl bg-white/60 border border-sky-200 rounded-2xl p-4 shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-200/70 shadow-inner grid place-items-center">💙</div>
            <div>
              <h1 className="text-xl font-semibold text-slate-800">Swiftie Engagement Arcade</h1>
              <p className="text-xs text-slate-500">Catch the Eras · Avoid the Paparazzi · Fill the Proposal Meter</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.button whileTap={{ scale: 0.96 }} onClick={()=>setRunning(r=>!r)} className="px-4 py-2 rounded-xl bg-sky-500 text-white shadow">{running? 'Pause' : 'Start'}</motion.button>
            <motion.button whileTap={{ scale: 0.96 }} onClick={()=>reset()} className="px-4 py-2 rounded-xl bg-white text-slate-700 border border-sky-200 shadow">Reset</motion.button>
          </div>
        </div>
      </header>

      <main className="w-full max-w-5xl">
        <div className="relative rounded-3xl border border-sky-200 bg-white/70 backdrop-blur-xl shadow-2xl overflow-hidden">
          <canvas ref={canvasRef} className="block w-full" width={W} height={H} />

          <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-3 md:hidden">
            <button onTouchStart={()=>setTouchDir(-1)} onTouchEnd={()=>setTouchDir(0)} className="px-4 py-3 rounded-2xl bg-white/80 border border-sky-200 shadow">⟵</button>
            <button onClick={()=>setRunning(r=>!r)} className="px-5 py-3 rounded-2xl bg-sky-500 text-white shadow">{running? '⏸' : '▶'}</button>
            <button onTouchStart={()=>setTouchDir(1)} onTouchEnd={()=>setTouchDir(0)} className="px-4 py-3 rounded-2xl bg-white/80 border border-sky-200 shadow">⟶</button>
          </div>
        </div>

        <section className="grid md:grid-cols-3 gap-4 mt-6">
          <div className="p-4 rounded-2xl border border-sky-200 bg-white/70 backdrop-blur-xl shadow">
            <h3 className="font-semibold text-slate-800">How to Play</h3>
            <p className="text-sm text-slate-600 mt-1">Move with ←/→ or A/D. Press Space to Start/Pause. Catch 💍 💖 ✨ — dodge 📸.</p>
          </div>
          <div className="p-4 rounded-2xl border border-sky-200 bg-white/70 backdrop-blur-xl shadow">
            <h3 className="font-semibold text-slate-800">Win Condition</h3>
            <p className="text-sm text-slate-600 mt-1">Fill the Proposal Meter to 100 by collecting goodies. When it’s full, a proposal moment triggers with confetti and a big 💍.</p>
          </div>
          <div className="p-4 rounded-2xl border border-sky-200 bg-white/70 backdrop-blur-xl shadow">
            <h3 className="font-semibold text-slate-800">Make it Personal</h3>
            <p className="text-sm text-slate-600 mt-1">Edit the banner text in <code>drawProposal()</code> to put your own message for your GF. Change tint to <code>#38b6ff</code> if you like.</p>
          </div>
        </section>
      </main>

      <footer className="mt-8 text-xs text-slate-500">Built with ❤️ for Swifties · React + Canvas · Ready for Vercel</footer>
    </div>
  )
}
