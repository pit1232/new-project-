import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Sphere, MeshDistortMaterial } from '@react-three/drei'
import * as THREE from 'three'

interface OrbMeshProps {
  state: 'idle' | 'thinking' | 'speaking'
}

function OrbMesh({ state }: OrbMeshProps): React.ReactElement {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<any>(null)

  const config = useMemo(() => {
    switch (state) {
      case 'thinking':
        return { speed: 4, distort: 0.6, color: '#10b981', emissive: '#059669', intensity: 2.5 }
      case 'speaking':
        return { speed: 2.5, distort: 0.8, color: '#06b6d4', emissive: '#0891b2', intensity: 3 }
      default:
        return { speed: 1.2, distort: 0.3, color: '#10b981', emissive: '#064e3b', intensity: 1.5 }
    }
  }, [state])

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * (state === 'thinking' ? 0.8 : 0.2)
      meshRef.current.rotation.x += delta * 0.1

      // Pulse scale
      const scale = 1 + Math.sin(Date.now() * 0.002 * (state === 'idle' ? 1 : 2)) * (state === 'idle' ? 0.03 : 0.06)
      meshRef.current.scale.setScalar(scale)
    }
  })

  return (
    <Sphere ref={meshRef} args={[1, 64, 64]}>
      <MeshDistortMaterial
        ref={materialRef}
        color={config.color}
        emissive={config.emissive}
        emissiveIntensity={config.intensity}
        roughness={0.2}
        metalness={0.8}
        distort={config.distort}
        speed={config.speed}
        transparent
        opacity={0.9}
      />
    </Sphere>
  )
}

function Particles(): React.ReactElement {
  const pointsRef = useRef<THREE.Points>(null)
  const count = 200

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 1.5 + Math.random() * 1.5
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = r * Math.cos(phi)
    }
    return pos
  }, [])

  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.05
      pointsRef.current.rotation.x += delta * 0.02
    }
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.015}
        color="#10b981"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  )
}

interface NeuralOrbProps {
  state?: 'idle' | 'thinking' | 'speaking'
  size?: number
}

function NeuralOrb({ state = 'idle', size = 200 }: NeuralOrbProps): React.ReactElement {
  return (
    <div style={{ width: size, height: size }} className="relative">
      {/* Ambient glow behind orb */}
      <div
        className={`absolute inset-0 rounded-full blur-3xl transition-all duration-1000 ${
          state === 'thinking'
            ? 'bg-emerald-500/30 scale-110'
            : state === 'speaking'
              ? 'bg-cyan-500/30 scale-110'
              : 'bg-emerald-500/15 scale-100'
        }`}
      />
      <Canvas camera={{ position: [0, 0, 3.5], fov: 45 }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[5, 5, 5]} intensity={1} color="#10b981" />
        <pointLight position={[-5, -5, -5]} intensity={0.5} color="#06b6d4" />
        <OrbMesh state={state} />
        <Particles />
      </Canvas>
    </div>
  )
}

export default NeuralOrb
