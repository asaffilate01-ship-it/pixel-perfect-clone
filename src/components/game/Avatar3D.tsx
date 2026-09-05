import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Float, RoundedBox } from "@react-three/drei";
import { Component, type ReactNode, useRef } from "react";
import type { Group } from "three";
import type { AvatarSettings } from "@/lib/avatarSettings";

type Props = { settings: AvatarSettings; size?: number; fallback?: ReactNode };

class WebGLErrorBoundary extends Component<
  { fallback?: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function Avatar3D({ settings, size = 160, fallback }: Props) {
  return (
    <div
      className="relative isolate overflow-hidden rounded-[28%] bg-gradient-to-br from-cyan-300 via-violet-400 to-indigo-950 shadow-[0_22px_45px_-20px_rgba(67,56,202,.8)] ring-1 ring-white/45"
      style={{ width: size, height: size }}
      role="img"
      aria-label="Your customised 3D avatar"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,.55),transparent_28%)]" />
      <WebGLErrorBoundary fallback={fallback}>
        <Canvas
          camera={{ position: [0, 0.18, 5.4], fov: 31 }}
          dpr={[1, 1.75]}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          className="touch-none"
        >
          <ambientLight intensity={1.25} />
          <directionalLight position={[-3, 5, 5]} intensity={3.2} color="#fff7ed" />
          <directionalLight position={[4, 2, 3]} intensity={2.2} color="#bae6fd" />
          <pointLight position={[0, -1, 3]} intensity={1.2} color="#c4b5fd" />
          <Float speed={1.2} rotationIntensity={0.08} floatIntensity={0.14}>
            <Character settings={settings} />
          </Float>
          <ContactShadows position={[0, -2.08, 0]} opacity={0.34} scale={4} blur={2.8} far={4} />
          <Environment preset="studio" environmentIntensity={0.32} />
        </Canvas>
      </WebGLErrorBoundary>
      <div className="pointer-events-none absolute inset-x-[18%] bottom-[7%] h-[7%] rounded-full bg-indigo-950/30 blur-md" />
    </div>
  );
}

function Character({ settings: s }: { settings: AvatarSettings }) {
  const group = useRef<Group>(null);
  useFrame(({ clock, pointer }) => {
    if (!group.current) return;
    group.current.rotation.y += (pointer.x * 0.16 - group.current.rotation.y) * 0.045;
    group.current.rotation.x += (-pointer.y * 0.05 - group.current.rotation.x) * 0.04;
    group.current.position.y = Math.sin(clock.elapsedTime * 1.25) * 0.018 - 0.12;
  });
  const headScale: [number, number, number] =
    s.faceShape === "round"
      ? [1.04, 1.03, 1]
      : s.faceShape === "square"
        ? [1.02, 1.12, 0.98]
        : [0.96, 1.13, 1];
  return (
    <group ref={group} position={[0, -0.12, 0]}>
      <Torso color={s.clothesColor} style={s.outfitStyle} />
      <mesh position={[0, -0.66, 0]} scale={[0.43, 0.58, 0.42]}>
        <sphereGeometry args={[1, 48, 32]} />
        <SkinMaterial color={s.skin} />
      </mesh>
      <mesh position={[-0.92, 0.24, 0]} scale={[0.19, 0.29, 0.12]}>
        <sphereGeometry args={[1, 32, 24]} />
        <SkinMaterial color={s.skin} />
      </mesh>
      <mesh position={[0.92, 0.24, 0]} scale={[0.19, 0.29, 0.12]}>
        <sphereGeometry args={[1, 32, 24]} />
        <SkinMaterial color={s.skin} />
      </mesh>
      <mesh position={[0, 0.35, 0]} scale={headScale} castShadow>
        <sphereGeometry args={[0.93, 64, 48]} />
        <SkinMaterial color={s.skin} />
      </mesh>
      <Face settings={s} />
      <Hair settings={s} />
      <FacialHair settings={s} />
      {s.glasses && <Glasses style={s.glassesStyle} />}
      {s.accessory !== "none" && <Earrings style={s.accessory} />}
    </group>
  );
}

function SkinMaterial({ color }: { color: string }) {
  return <meshStandardMaterial color={color} roughness={0.72} metalness={0} />;
}

function Torso({ color, style }: { color: string; style: AvatarSettings["outfitStyle"] }) {
  return (
    <group position={[0, -1.58, -0.08]}>
      <mesh scale={[1.37, 0.78, 0.58]} castShadow>
        <sphereGeometry args={[1, 48, 28]} />
        <meshStandardMaterial color={color} roughness={0.62} />
      </mesh>
      {style === "jersey" && (
        <>
          <mesh position={[-0.58, 0.2, 0.53]} rotation={[0, 0, -0.62]}>
            <boxGeometry args={[0.13, 0.7, 0.04]} />
            <meshStandardMaterial color="#fff" opacity={0.82} transparent />
          </mesh>
          <mesh position={[0.58, 0.2, 0.53]} rotation={[0, 0, 0.62]}>
            <boxGeometry args={[0.13, 0.7, 0.04]} />
            <meshStandardMaterial color="#fff" opacity={0.82} transparent />
          </mesh>
        </>
      )}
      {style === "hoodie" && (
        <>
          <mesh position={[0, 0.42, 0.48]} rotation={[0, 0, 0.78]}>
            <torusGeometry args={[0.43, 0.08, 12, 40, 0.78]} />
            <meshStandardMaterial color="#fff" opacity={0.72} transparent />
          </mesh>
          <mesh position={[0, 0.42, 0.48]} rotation={[0, 0, -0.78]}>
            <torusGeometry args={[0.43, 0.08, 12, 40, 0.78]} />
            <meshStandardMaterial color="#fff" opacity={0.72} transparent />
          </mesh>
        </>
      )}
    </group>
  );
}

function Face({ settings: s }: { settings: AvatarSettings }) {
  const browY = 0.61;
  return (
    <group>
      {[-0.34, 0.34].map((x, i) => (
        <group key={x} position={[x, 0.38, 0.86]}>
          <mesh scale={[0.23, 0.135, 0.07]}>
            <sphereGeometry args={[1, 40, 24]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.35} />
          </mesh>
          <mesh position={[0, 0, 0.075]} scale={[0.105, 0.105, 0.045]}>
            <sphereGeometry args={[1, 32, 20]} />
            <meshStandardMaterial color={s.eyeColor} roughness={0.25} />
          </mesh>
          <mesh position={[-0.025, 0.025, 0.118]} scale={[0.028, 0.028, 0.018]}>
            <sphereGeometry args={[1, 16, 12]} />
            <meshBasicMaterial color="#fff" />
          </mesh>
        </group>
      ))}
      {[-0.34, 0.34].map((x) => (
        <RoundedBox
          key={x}
          args={[0.42, s.browStyle === "bold" ? 0.085 : 0.06, 0.055]}
          radius={0.04}
          smoothness={4}
          position={[x, browY, 0.86]}
          rotation={[0, 0, x < 0 ? 0.12 : -0.12]}
        >
          <meshStandardMaterial color={s.hairColor} roughness={0.75} />
        </RoundedBox>
      ))}
      <mesh
        position={[0, 0.12, 0.98]}
        rotation={[0.08, 0, 0]}
        scale={
          s.noseStyle === "wide"
            ? [0.22, 0.33, 0.22]
            : s.noseStyle === "small"
              ? [0.13, 0.25, 0.15]
              : [0.17, 0.32, 0.18]
        }
      >
        <sphereGeometry args={[1, 32, 24]} />
        <SkinMaterial color={s.skin} />
      </mesh>
      <Mouth style={s.mouthStyle} makeup={s.makeup} />
      {s.makeup !== "none" && (
        <>
          {[-0.59, 0.59].map((x) => (
            <mesh key={x} position={[x, 0.02, 0.83]} scale={[0.24, 0.09, 0.035]}>
              <sphereGeometry args={[1, 24, 16]} />
              <meshStandardMaterial
                color="#ec6684"
                transparent
                opacity={s.makeup === "bold" ? 0.48 : 0.2}
              />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
}

function Mouth({
  style,
  makeup,
}: {
  style: AvatarSettings["mouthStyle"];
  makeup: AvatarSettings["makeup"];
}) {
  const color = makeup === "bold" ? "#9f174d" : makeup === "natural" ? "#a94f5d" : "#783f3b";
  if (style === "grin")
    return (
      <RoundedBox
        args={[0.44, 0.15, 0.045]}
        radius={0.07}
        smoothness={6}
        position={[0, -0.29, 0.89]}
      >
        <meshStandardMaterial color="#fffaf7" roughness={0.35} />
      </RoundedBox>
    );
  return (
    <mesh
      position={[0, -0.27, 0.9]}
      rotation={[0, 0, style === "smile" ? 0 : Math.PI]}
      scale={[0.32, style === "smile" ? 0.12 : 0.055, 0.035]}
    >
      <torusGeometry args={[0.52, 0.1, 12, 38, Math.PI]} />
      <meshStandardMaterial color={color} roughness={0.5} />
    </mesh>
  );
}

function Hair({ settings: s }: { settings: AvatarSettings }) {
  const material = <meshStandardMaterial color={s.hairColor} roughness={0.72} metalness={0.02} />;
  if (s.hairStyle === "bald") return null;
  if (s.hairStyle === "buzz")
    return (
      <mesh position={[0, 0.73, -0.02]} scale={[1, 0.68, 0.95]}>
        <sphereGeometry args={[0.91, 48, 32, 0, Math.PI * 2, 0, Math.PI * 0.57]} />
        {material}
      </mesh>
    );
  if (s.hairStyle === "mohawk")
    return (
      <group>
        {[-0.32, -0.08, 0.16, 0.4, 0.64, 0.86, 1.05].map((y, i) => (
          <mesh key={y} position={[0, y, -0.02]} scale={[0.2, 0.3 + 0.08 * Math.sin(i), 0.55]}>
            {material}
            <sphereGeometry args={[1, 28, 18]} />
          </mesh>
        ))}
      </group>
    );
  if (s.hairStyle === "covered")
    return (
      <mesh position={[0, 0.56, -0.04]} scale={[1.08, 1.07, 1]}>
        <sphereGeometry args={[0.92, 48, 36, 0, Math.PI * 2, 0, Math.PI * 0.7]} />
        <meshStandardMaterial color={s.clothesColor} roughness={0.85} />
      </mesh>
    );
  if (s.hairStyle === "afro" || s.hairStyle === "curls") {
    const afro = s.hairStyle === "afro";
    return (
      <group>
        {[
          [-0.72, 0.8, -0.1],
          [-0.5, 1.18, -0.08],
          [-0.12, 1.34, -0.08],
          [0.28, 1.3, -0.08],
          [0.62, 1.05, -0.08],
          [0.76, 0.7, -0.08],
          [-0.35, 0.88, 0.1],
          [0.1, 0.98, 0.14],
          [0.45, 0.83, 0.1],
        ].map(([x, y, z], i) => (
          <mesh
            key={i}
            position={[x, y, z]}
            scale={[afro ? 0.43 : 0.3, afro ? 0.43 : 0.3, afro ? 0.43 : 0.3]}
          >
            <sphereGeometry args={[1, 24, 18]} />
            {material}
          </mesh>
        ))}
      </group>
    );
  }
  if (s.hairStyle === "long")
    return (
      <group>
        <mesh position={[0, 0.72, -0.16]} scale={[1.06, 0.83, 1]}>
          <sphereGeometry args={[0.92, 48, 32, 0, Math.PI * 2, 0, Math.PI * 0.66]} />
          {material}
        </mesh>
        {[-0.82, 0.82].map((x) => (
          <mesh key={x} position={[x, -0.12, -0.08]} scale={[0.24, 0.92, 0.3]}>
            <capsuleGeometry args={[1, 1, 8, 20]} />
            {material}
          </mesh>
        ))}
      </group>
    );
  return (
    <group>
      <mesh position={[0, 0.75, -0.05]} scale={[1.03, 0.72, 0.96]}>
        <sphereGeometry args={[0.92, 48, 32, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
        {material}
      </mesh>
      {s.hairStyle === "waves" &&
        [-0.55, -0.25, 0.05, 0.35, 0.62].map((x, i) => (
          <mesh key={x} position={[x, 0.91 + (i % 2) * 0.08, 0.69]} scale={[0.22, 0.28, 0.18]}>
            <sphereGeometry args={[1, 24, 16]} />
            {material}
          </mesh>
        ))}
      {s.hairStyle === "bun" && (
        <mesh position={[0.52, 1.4, -0.18]} scale={[0.4, 0.4, 0.4]}>
          <sphereGeometry args={[1, 32, 24]} />
          {material}
        </mesh>
      )}
    </group>
  );
}

function FacialHair({ settings: s }: { settings: AvatarSettings }) {
  if (s.facialHair === "none") return null;
  const mat = (
    <meshStandardMaterial
      color={s.hairColor}
      roughness={0.82}
      transparent
      opacity={s.facialHair === "stubble" ? 0.38 : 0.96}
    />
  );
  if (s.facialHair === "moustache")
    return (
      <group>
        {[-0.14, 0.14].map((x) => (
          <mesh
            key={x}
            position={[x, -0.13, 0.98]}
            rotation={[0, 0, x < 0 ? 0.22 : -0.22]}
            scale={[0.24, 0.09, 0.07]}
          >
            <sphereGeometry args={[1, 24, 16]} />
            {mat}
          </mesh>
        ))}
      </group>
    );
  if (s.facialHair === "goatee")
    return (
      <group>
        <FacialHair settings={{ ...s, facialHair: "moustache" }} />
        <mesh position={[0, -0.55, 0.91]} scale={[0.25, 0.38, 0.09]}>
          <sphereGeometry args={[1, 28, 18]} />
          {mat}
        </mesh>
      </group>
    );
  return (
    <group>
      <mesh
        position={[0, -0.43, 0.72]}
        scale={s.facialHair === "boxed" ? [0.78, 0.55, 0.35] : [0.86, 0.72, 0.4]}
      >
        <sphereGeometry args={[1, 40, 28, 0, Math.PI * 2, Math.PI * 0.2, Math.PI * 0.72]} />
        {mat}
      </mesh>
      {s.facialHair === "beard" && (
        <mesh position={[0, -0.88, 0.55]} scale={[0.54, 0.46, 0.28]}>
          <sphereGeometry args={[1, 32, 24]} />
          {mat}
        </mesh>
      )}
    </group>
  );
}

function Glasses({ style }: { style: AvatarSettings["glassesStyle"] }) {
  const round = style === "round";
  return (
    <group position={[0, 0.39, 1.02]}>
      {[-0.34, 0.34].map((x) => (
        <mesh key={x} position={[x, 0, 0]} scale={[round ? 0.27 : 0.3, round ? 0.2 : 0.18, 0.035]}>
          <torusGeometry args={[0.8, 0.08, 10, 36]} />
          <meshStandardMaterial color="#172033" metalness={0.5} roughness={0.3} />
        </mesh>
      ))}
      <mesh scale={[0.15, 0.025, 0.025]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#172033" />
      </mesh>
    </group>
  );
}

function Earrings({ style }: { style: AvatarSettings["accessory"] }) {
  return (
    <>
      {[-0.97, 0.97].map((x) => (
        <mesh key={x} position={[x, 0.05, 0.03]} scale={[0.08, 0.08, 0.04]}>
          <torusGeometry args={[style === "hoop" ? 0.7 : 0.18, 0.18, 10, 30]} />
          <meshStandardMaterial color="#f8c84a" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}
    </>
  );
}
