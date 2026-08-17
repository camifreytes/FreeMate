'use client';

import { useEffect } from 'react';

// --- Utilidades de color ---

function hexARgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return {
    r: parseInt(full.substr(0, 2), 16),
    g: parseInt(full.substr(2, 2), 16),
    b: parseInt(full.substr(4, 2), 16),
  };
}

function rgbaStr({ r, g, b }, a) {
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// Luminancia percibida (0 = negro, 255 = blanco)
function luminancia({ r, g, b }) {
  return (r * 299 + g * 587 + b * 114) / 1000;
}

// Mezcla dos colores en proporción t (0..1)
function mezclar(c1, c2, t) {
  return {
    r: Math.round(c1.r + (c2.r - c1.r) * t),
    g: Math.round(c1.g + (c2.g - c1.g) * t),
    b: Math.round(c1.b + (c2.b - c1.b) * t),
  };
}

function aHex({ r, g, b }) {
  const h = (n) => n.toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

export default function TemaColor({ colorFondo, colorTexto }) {
  useEffect(() => {
    const root = document.documentElement;
    const bg = colorFondo || '#16171a';
    const text = colorTexto || '#f5f6f7';

    const rgbBg = hexARgb(bg);
    const rgbText = hexARgb(text);
    const bgClaro = luminancia(rgbBg) > 140; // ¿el fondo es claro?

    // Blanco o negro para mezclar, según si el fondo es claro u oscuro
    const tinte = bgClaro ? { r: 0, g: 0, b: 0 } : { r: 255, g: 255, b: 255 };

    // Superficies derivadas del fondo (tarjetas, botones tenues)
    const bgSoft = aHex(mezclar(rgbBg, tinte, 0.05));
    const card = aHex(mezclar(rgbBg, tinte, 0.08));
    const cardHover = aHex(mezclar(rgbBg, tinte, 0.12));
    // Líneas y texto atenuado, adaptados al fondo
    const line = rgbaStr(tinte, 0.14);
    const textDim = rgbaStr(rgbText, 0.6);

    // Verde de "acierto/WhatsApp" adaptado para que se lea sobre el fondo
    const verde = bgClaro ? '#1e9e57' : '#7bc98a';
    const rojo = bgClaro ? '#c94040' : '#e88a8a';

    root.style.setProperty('--bg', bg);
    root.style.setProperty('--text', text);
    root.style.setProperty('--bg-soft', bgSoft);
    root.style.setProperty('--card', card);
    root.style.setProperty('--card-hover', cardHover);
    root.style.setProperty('--line', line);
    root.style.setProperty('--text-dim', textDim);
    root.style.setProperty('--ok', verde);
    root.style.setProperty('--no', rojo);

    document.body.style.background = bg;
    document.body.style.color = text;
  }, [colorFondo, colorTexto]);

  return null;
}
