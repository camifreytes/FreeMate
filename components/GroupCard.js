'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

const gradientes = [
  'linear-gradient(135deg,#5b6472,#363a42)',
  'linear-gradient(135deg,#6d5b72,#3d3642)',
  'linear-gradient(135deg,#5b726a,#36423d)',
  'linear-gradient(135deg,#72675b,#423d36)',
];

export default function GroupCard({ group, index }) {
  const grad = gradientes[index % gradientes.length];
  const inicial = group.nombre.charAt(0).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1],
        delay: 0.25 + index * 0.1,
      }}
      whileHover={{ y: -6 }}
    >
      <Link
        href={`/grupo/${group.id}`}
        style={{
          background: 'var(--card)',
          border: '0.5px solid var(--line)',
          borderRadius: '22px',
          padding: '26px 24px',
          cursor: 'pointer',
          boxShadow: '0 8px 30px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.25)',
          display: 'block',
        }}
      >
      <div
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '15px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          fontWeight: 600,
          marginBottom: '20px',
          background: grad,
          color: '#fff',
        }}
      >
        {inicial}
      </div>
      <h3
        style={{
          fontSize: '21px',
          fontWeight: 600,
          letterSpacing: '-0.02em',
          marginBottom: '6px',
        }}
      >
        {group.nombre}
      </h3>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: 'var(--text-dim)',
          fontSize: '14px',
        }}
      >
        <span>
          {group.miembros} {group.miembros === 1 ? 'persona' : 'personas'}
        </span>
      </div>
      </Link>
    </motion.div>
  );
}
