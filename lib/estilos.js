// Estilo base para botones de acción principales (fondo = color texto, letra = color fondo)
export function btnPrimario(extra = {}) {
  return {
    background: 'var(--text)',
    color: 'var(--bg)',
    border: '1.5px solid var(--text)',
    borderRadius: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    ...extra,
  };
}

// Botón secundario (fondo tenue, borde del color de texto)
export function btnSecundario(extra = {}) {
  return {
    background: 'transparent',
    color: 'var(--text)',
    border: '1.5px solid var(--text)',
    borderRadius: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    ...extra,
  };
}
