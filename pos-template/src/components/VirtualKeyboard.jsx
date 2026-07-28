import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Keyboard, X, GripVertical, Delete, CornerDownLeft, ArrowUp } from 'lucide-react';

const LAYOUTS = {
  abc: [
    ['A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['SHIFT', 'W', 'X', 'C', 'V', 'B', 'N', 'M', '⌫'],
  ],
  abcUpper: [
    ['A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['SHIFT', 'W', 'X', 'C', 'V', 'B', 'N', 'M', '⌫'],
  ],
  numbers: [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['@', '#', '$', '%', '&', '*', '-', '+', '='],
    ['⌫', ',', '.', '(', ')', '!', '?', 'ESPACE'],
  ],
  symbols: [
    ['~', '`', '|', '·', '√', 'π', '÷', '×', '¶', 'Δ'],
    ['©', '£', '¥', '€', '¢', '^', '°', '=', '{', '}'],
    ['[', ']', '«', '»', '"', "'", ':', ';', 'ESPACE'],
  ],
  emojis: [
    ['😀', '😂', '😍', '🥰', '😎', '🤔', '😅', '🙄', '😴', '🥳'],
    ['👍', '👎', '❤️', '🔥', '⭐', '✅', '🎉', '💰', '📦', '🛒'],
    ['🍔', '☕', '🍕', '🥤', '🍰', '🎂', '🍺', '🍷', '🥂', '🍰'],
  ],
};

const LAYOUT_TABS = [
  { id: 'abc', label: 'ABC' },
  { id: 'numbers', label: '123' },
  { id: 'symbols', label: '#+=' },
  { id: 'emojis', label: '😊' },
];

const MIN_W = 360;
const MIN_H = 220;
const MAX_W = 1200;
const MAX_H = 800;
const DEFAULT_W = 540;
const DEFAULT_H = 320;
const FAB_SIZE = 52;
const FAB_MARGIN = 20;

function getDefaultFabPos() {
  return {
    x: window.innerWidth - FAB_SIZE - FAB_MARGIN,
    y: window.innerHeight - FAB_SIZE - FAB_MARGIN,
  };
}

function getIsDark() {
  return document.documentElement.classList.contains('dark') ||
    document.documentElement.getAttribute('data-theme') === 'dark' ||
    getComputedStyle(document.documentElement).getPropertyValue('color-scheme') === 'dark';
}

export default function VirtualKeyboard({ onEnter, disabled = false, autoOpen = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [shift, setShift] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [layout, setLayout] = useState('abc');
  const [isDark, setIsDark] = useState(false);
  const [activePress, setActivePress] = useState(null);

  const [kbPos, setKbPos] = useState({ x: 0, y: 0 });
  const [kbSize, setKbSize] = useState({ w: DEFAULT_W, h: DEFAULT_H });

  const [dragging, setDragging] = useState(null);
  const [resizing, setResizing] = useState(null);
  const dragRef = useRef({ startX: 0, startY: 0, startPosX: 0, startPosY: 0 });
  const panelRef = useRef(null);
  const lastFocusedInput = useRef(null);
  const hasAutoOpened = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const check = () => {
      if (!mountedRef.current) return;
      const next = getIsDark();
      setIsDark(prev => prev === next ? prev : next);
    };
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    return () => { mountedRef.current = false; obs.disconnect(); };
  }, []);

  useEffect(() => {
    if (autoOpen && !isOpen && !hasAutoOpened.current && !disabled) {
      hasAutoOpened.current = true;
      const raf = requestAnimationFrame(() => {
        if (mountedRef.current) openKeyboard();
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [autoOpen, disabled]);

  useEffect(() => {
    if (disabled) hasAutoOpened.current = false;
  }, [disabled]);

  useEffect(() => {
    const onFocus = (e) => {
      const el = e.target;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && !el.readOnly && !el.disabled) {
        if (!el.closest('.vk-key') && !el.closest('.vk-toggle') && !el.closest('.vk-resize') && !el.closest('.vk-tab')) {
          lastFocusedInput.current = el;
        }
      }
    };
    document.addEventListener('focusin', onFocus, true);
    return () => document.removeEventListener('focusin', onFocus, true);
  }, []);

  useEffect(() => {
    if (!dragging && !resizing) return;
    const onMove = (e) => {
      if (dragging === 'kb') {
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        setKbPos({
          x: Math.max(0, Math.min(window.innerWidth - kbSize.w, dragRef.current.startPosX + dx)),
          y: Math.max(0, Math.min(window.innerHeight - kbSize.h, dragRef.current.startPosY + dy)),
        });
      } else if (resizing) {
        const dx = e.clientX - resizing.startX;
        const dy = e.clientY - resizing.startY;
        const { edge, startPos, startSize } = resizing;
        let newX = startPos.x, newY = startPos.y, newW = startSize.w, newH = startSize.h;
        if (edge.includes('e')) newW = Math.max(MIN_W, Math.min(MAX_W, startSize.w + dx));
        if (edge.includes('w')) { newW = Math.max(MIN_W, Math.min(MAX_W, startSize.w - dx)); newX = startPos.x + (startSize.w - newW); }
        if (edge.includes('s')) newH = Math.max(MIN_H, Math.min(MAX_H, startSize.h + dy));
        if (edge.includes('n')) { newH = Math.max(MIN_H, Math.min(MAX_H, startSize.h - dy)); newY = startPos.y + (startSize.h - newH); }
        newX = Math.max(0, Math.min(window.innerWidth - newW, newX));
        newY = Math.max(0, Math.min(window.innerHeight - newH, newY));
        setKbPos({ x: newX, y: newY });
        setKbSize({ w: newW, h: newH });
      }
    };
    const onUp = () => { setDragging(null); setResizing(null); };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };
  }, [dragging, resizing, kbSize, kbPos]);

  const openKeyboard = useCallback(() => {
    const w = DEFAULT_W, h = DEFAULT_H;
    const defaultPos = getDefaultFabPos();
    const x = Math.max(0, Math.min(window.innerWidth - w, defaultPos.x - w / 2 + FAB_SIZE / 2));
    const y = Math.max(10, defaultPos.y - h - 16);
    setKbPos({ x, y });
    setKbSize({ w, h });
    setIsOpen(true);
  }, []);

  const closeKeyboard = useCallback(() => {
    setIsOpen(false);
    setDragging(null);
  }, []);

  const toggleKeyboard = useCallback(() => {
    if (isOpen) closeKeyboard(); else openKeyboard();
  }, [isOpen, openKeyboard, closeKeyboard]);

  const writeToActiveElement = useCallback((text, isBackspace, isSpace) => {
    const el = (lastFocusedInput.current && lastFocusedInput.current.isConnected) ? lastFocusedInput.current : document.activeElement;
    if (!el || (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') || el.readOnly || el.disabled) return;
    if (el.closest('.vk-key') || el.closest('.vk-toggle') || el.closest('.vk-resize') || el.closest('.vk-tab')) return;

    if (el.type === 'number' || el.inputMode === 'numeric') {
      setLayout('numbers');
    }

    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (!nativeSetter) return;

    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const current = el.value;

    if (isBackspace) {
      if (start !== end) {
        nativeSetter.call(el, current.slice(0, start) + current.slice(end));
        el.selectionStart = el.selectionEnd = start;
      } else if (start > 0) {
        nativeSetter.call(el, current.slice(0, start - 1) + current.slice(start));
        el.selectionStart = el.selectionEnd = start - 1;
      }
    } else if (isSpace) {
      nativeSetter.call(el, current.slice(0, start) + ' ' + current.slice(end));
      el.selectionStart = el.selectionEnd = start + 1;
    } else {
      nativeSetter.call(el, current.slice(0, start) + text + current.slice(end));
      el.selectionStart = el.selectionEnd = start + text.length;
    }

    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, []);

  const focusNextInput = useCallback((direction) => {
    const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([disabled]), textarea:not([disabled])'))
      .filter(el => !el.readOnly && !el.closest('.vk-key') && !el.closest('.vk-toggle'));
    const active = document.activeElement;
    const idx = inputs.indexOf(active);
    if (idx === -1) return;
    let nextIdx;
    if (direction === 'next') nextIdx = (idx + 1) % inputs.length;
    else if (direction === 'prev') nextIdx = (idx - 1 + inputs.length) % inputs.length;
    else return;
    inputs[nextIdx]?.focus();
  }, []);

  const triggerPress = useCallback((key) => {
    setActivePress(key);
    setTimeout(() => setActivePress(null), 150);
  }, []);

  const handleKey = useCallback((key) => {
    if (disabled) return;
    triggerPress(key);
    if (key === 'SHIFT') { setShift(s => !s); return; }
    if (key === 'CAPS') { setCapsLock(c => !c); return; }
    if (key === 'ESPACE') { writeToActiveElement(null, false, true); return; }
    if (key === '⌫') { writeToActiveElement(null, true, false); return; }
    if (key === 'TAB') { focusNextInput('next'); return; }
    if (key === '←') {
      const el = document.activeElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
        const pos = Math.max(0, (el.selectionStart ?? 0) - 1);
        el.selectionStart = el.selectionEnd = pos;
      }
      return;
    }
    if (key === '→') {
      const el = document.activeElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
        const pos = Math.min(el.value.length, (el.selectionEnd ?? 0) + 1);
        el.selectionStart = el.selectionEnd = pos;
      }
      return;
    }
    if (key === '↑' || key === '↓') return;

    const useUpper = shift || capsLock;
    const char = useUpper ? key.toUpperCase() : (layout === 'abc' || layout === 'abcUpper') ? key.toLowerCase() : key;
    writeToActiveElement(char, false, false);
    if (shift && !capsLock && (layout === 'abc' || layout === 'abcUpper')) setShift(false);
  }, [disabled, shift, capsLock, layout, writeToActiveElement, focusNextInput, triggerPress]);

  const onFabPointerDown = (e) => {
    if (e.target.closest('.vk-toggle')) return;
    e.preventDefault();
  };

  const onKbHeaderPointerDown = (e) => {
    if (e.target.closest('.vk-toggle') || e.target.closest('.vk-key') || e.target.closest('.vk-tab')) return;
    e.preventDefault();
    setDragging('kb');
    dragRef.current = {
      startX: e.clientX, startY: e.clientY,
      startPosX: kbPos.x, startPosY: kbPos.y,
    };
  };

  const onResizePointerDown = (e, edge) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing({
      edge, startX: e.clientX, startY: e.clientY,
      startPos: { ...kbPos }, startSize: { ...kbSize },
    });
  };

  const theme = useMemo(() => {
    if (isDark) {
      return {
        panel: 'linear-gradient(145deg, #1a1a2e 0%, #16162a 50%, #0f0f23 100%)',
        panelBorder: '1px solid rgba(255,255,255,0.06)',
        header: 'linear-gradient(90deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
        headerBorder: '1px solid rgba(255,255,255,0.06)',
        keyBg: 'rgba(255,255,255,0.06)',
        keyHover: 'rgba(255,255,255,0.12)',
        keyText: 'rgba(255,255,255,0.88)',
        keyBorder: '1px solid rgba(255,255,255,0.04)',
        specialBg: 'rgba(255,255,255,0.04)',
        specialText: 'rgba(255,255,255,0.45)',
        backspaceBg: 'rgba(239,68,68,0.1)',
        backspaceText: '#f87171',
        shiftBg: 'rgba(255,255,255,0.06)',
        shiftActiveBg: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
        shiftText: 'rgba(255,255,255,0.45)',
        enterBg: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
        enterShadow: '0 2px 12px rgba(99,102,241,0.35)',
        activeTab: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
        activeTabText: '#ffffff',
        inactiveTabText: 'rgba(255,255,255,0.3)',
        fabBg: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
        fabShadow: '0 4px 20px rgba(79,70,229,0.45)',
        fabActiveBg: 'linear-gradient(145deg, #334155 0%, #1e293b 100%)',
        pressBg: 'rgba(255,255,255,0.18)',
        shadow: '0 25px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.05)',
      };
    }
    return {
      panel: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)',
      panelBorder: '1px solid rgba(0,0,0,0.08)',
      header: 'linear-gradient(90deg, #f1f5f9 0%, #f8fafc 100%)',
      headerBorder: '1px solid rgba(0,0,0,0.06)',
      keyBg: '#ffffff',
      keyHover: '#f1f5f9',
      keyText: '#1e293b',
      keyBorder: '1px solid rgba(0,0,0,0.06)',
      specialBg: '#f1f5f9',
      specialText: '#64748b',
      backspaceBg: '#fef2f2',
      backspaceText: '#ef4444',
      shiftBg: '#f1f5f9',
      shiftActiveBg: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
      shiftText: '#64748b',
      enterBg: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
      enterShadow: '0 2px 10px rgba(59,130,246,0.3)',
      activeTab: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
      activeTabText: '#ffffff',
      inactiveTabText: '#94a3b8',
      fabBg: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
      fabShadow: '0 4px 16px rgba(59,130,246,0.4)',
      fabActiveBg: 'linear-gradient(145deg, #475569 0%, #334155 100%)',
      pressBg: 'rgba(0,0,0,0.08)',
      shadow: '0 20px 50px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
    };
  }, [isDark]);

  if (disabled) return null;

  const currentLayout = layout === 'abc'
    ? (shift || capsLock ? LAYOUTS.abcUpper : LAYOUTS.abc)
    : LAYOUTS[layout] || LAYOUTS.abc;

  const panelH = kbSize.h;
  const tabBarH = 40;
  const headerH = 38;
  const enterRowH = 44;
  const keysAreaH = panelH - tabBarH - headerH - enterRowH - 20;
  const rows = currentLayout.length;
  const keyH = Math.max(34, Math.min(54, keysAreaH / Math.max(rows, 1)));
  const paddingX = 12;
  const paddingY = 8;
  const keyGap = 5;

  return createPortal(
    <>
      {/* ===== FAB ===== */}
      <div
        className="fixed z-[60] select-none"
        style={{
          right: FAB_MARGIN,
          bottom: FAB_MARGIN,
          touchAction: 'none',
        }}
        onPointerDown={onFabPointerDown}
      >
        <button
          onClick={toggleKeyboard}
          className="vk-toggle flex items-center justify-center transition-all duration-300 active:scale-90 rounded-full"
          style={{
            width: FAB_SIZE,
            height: FAB_SIZE,
            touchAction: 'none',
            background: isOpen ? theme.fabActiveBg : theme.fabBg,
            boxShadow: isOpen ? '0 4px 16px rgba(0,0,0,0.3)' : theme.fabShadow,
            color: '#ffffff',
          }}
        >
          {isOpen ? (
            <X className="w-5 h-5 transition-transform duration-200 rotate-0" />
          ) : (
            <Keyboard className="w-5 h-5 transition-transform duration-200" />
          )}
        </button>
      </div>

      {/* ===== Keyboard Panel ===== */}
      {isOpen && (
        <div
          ref={panelRef}
          className="fixed z-[70] select-none"
          style={{
            left: kbPos.x, top: kbPos.y,
            width: kbSize.w, height: kbSize.h,
            touchAction: 'none',
            transition: resizing ? 'none' : 'width 0.15s cubic-bezier(0.4, 0, 0.2, 1), height 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onPointerDown={(e) => {
            if (e.target.closest('.vk-key') || e.target.closest('.vk-toggle') || e.target.closest('.vk-resize') || e.target.closest('.vk-tab')) return;
            e.preventDefault();
          }}
        >
          <div
            className="rounded-2xl overflow-hidden flex flex-col"
            style={{
              width: '100%',
              height: '100%',
              background: theme.panel,
              boxShadow: theme.shadow,
              border: theme.panelBorder,
            }}
          >
            {/* ── Header ── */}
            <div
              className="px-4 flex items-center justify-between cursor-grab active:cursor-grabbing shrink-0"
              style={{
                height: headerH,
                background: theme.header,
                borderBottom: theme.headerBorder,
              }}
              onPointerDown={onKbHeaderPointerDown}
            >
              <div className="flex items-center gap-2">
                <Keyboard className="w-3.5 h-3.5" style={{ color: isDark ? 'rgba(139,92,246,0.8)' : '#6366f1' }} />
                <span className="font-semibold text-xs" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : '#64748b' }}>Clavier</span>
                <GripVertical className="w-3 h-3" style={{ color: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }} />
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => focusNextInput('prev')} className="vk-key w-6 h-6 rounded-lg flex items-center justify-center text-[9px] transition-colors duration-150" style={{ background: theme.specialBg, color: theme.specialText, touchAction: 'none' }}>◀</button>
                <button onClick={() => focusNextInput('next')} className="vk-key w-6 h-6 rounded-lg flex items-center justify-center text-[9px] transition-colors duration-150" style={{ background: theme.specialBg, color: theme.specialText, touchAction: 'none' }}>▶</button>
                <button onClick={closeKeyboard} className="vk-toggle w-6 h-6 rounded-lg flex items-center justify-center ml-1 transition-colors duration-150" style={{ background: theme.specialBg, color: theme.specialText }}>
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* ── Keys Area ── */}
            <div className="flex-1 flex flex-col justify-center overflow-hidden" style={{ padding: `${paddingY}px ${paddingX}px`, gap: `${keyGap}px` }}>
              {currentLayout.map((row, ri) => (
                <div key={ri} className="flex justify-center" style={{ gap: `${keyGap}px` }}>
                  {row.map((key) => {
                    const isWide = key === 'ESPACE';
                    const isShift = key === 'SHIFT';
                    const isCaps = key === 'CAPS';
                    const isBackspace = key === '⌫';
                    const isEmoji = layout === 'emojis';
                    const isPressed = activePress === key;

                    let bg, textColor, shadow;
                    if (isShift && (shift || capsLock)) {
                      bg = theme.shiftActiveBg;
                      textColor = '#ffffff';
                      shadow = '0 2px 8px rgba(99,102,241,0.35)';
                    } else if (isShift || isCaps) {
                      bg = theme.shiftBg;
                      textColor = theme.shiftText;
                      shadow = 'none';
                    } else if (isBackspace) {
                      bg = theme.backspaceBg;
                      textColor = theme.backspaceText;
                      shadow = 'none';
                    } else {
                      bg = isPressed ? theme.pressBg : theme.keyBg;
                      textColor = theme.keyText;
                      shadow = 'none';
                    }

                    const w = isWide
                      ? Math.max(100, kbSize.w - paddingX * 2 - keyGap * 4)
                      : (kbSize.w - paddingX * 2 - keyGap * (row.length - 1)) / row.length;

                    return (
                      <button
                        key={`${ri}-${key}`}
                        type="button"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleKey(key);
                        }}
                        className="vk-key rounded-xl font-medium transition-all duration-100 active:scale-[0.92] flex items-center justify-center select-none"
                        style={{
                          width: isWide ? Math.min(w, kbSize.w * 0.4) : w,
                          height: isEmoji ? Math.min(keyH, 44) : keyH,
                          flexShrink: 0,
                          fontSize: isEmoji ? '18px' : isShift || isBackspace || isCaps ? '11px' : Math.max(12, Math.min(16, keyH * 0.35)),
                          touchAction: 'none',
                          background: bg,
                          color: textColor,
                          boxShadow: shadow,
                          border: theme.keyBorder,
                          transform: isPressed ? 'scale(0.92)' : 'scale(1)',
                        }}
                      >
                        {isShift ? <ArrowUp className="w-3.5 h-3.5" /> : isBackspace ? <Delete className="w-4 h-4" /> : key}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* ── Enter / Bottom Row ── */}
            <div className="flex items-center shrink-0" style={{ padding: `0 ${paddingX}px ${paddingY}px`, gap: `${keyGap}px`, height: enterRowH }}>
              <button
                type="button"
                onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); focusNextInput('prev'); }}
                className="vk-key rounded-xl flex items-center justify-center text-[10px] font-bold shrink-0 transition-all duration-100 active:scale-[0.92]"
                style={{
                  width: 40, height: enterRowH - paddingY,
                  touchAction: 'none',
                  background: theme.specialBg,
                  color: theme.specialText,
                  border: theme.keyBorder,
                }}
              >
                TAB
              </button>
              <button
                type="button"
                onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); writeToActiveElement(null, false, true); }}
                className="vk-key rounded-xl flex items-center justify-center text-[11px] font-semibold shrink-0 transition-all duration-100 active:scale-[0.92]"
                style={{
                  width: 72, height: enterRowH - paddingY,
                  touchAction: 'none',
                  background: theme.specialBg,
                  color: theme.specialText,
                  border: theme.keyBorder,
                }}
              >
                Espace
              </button>
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const el = document.activeElement;
                  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
                    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
                  }
                  onEnter?.();
                }}
                className="vk-key rounded-xl flex items-center justify-center text-[12px] font-semibold flex-1 transition-all duration-100 active:scale-[0.97]"
                style={{
                  height: enterRowH - paddingY,
                  touchAction: 'none',
                  background: theme.enterBg,
                  color: '#ffffff',
                  boxShadow: theme.enterShadow,
                }}
              >
                <CornerDownLeft className="w-3.5 h-3.5 mr-1" /> Entrer
              </button>
            </div>

            {/* ── Layout Tabs ── */}
            <div className="flex shrink-0" style={{ height: tabBarH, borderTop: theme.headerBorder }}>
              {LAYOUT_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => { setLayout(tab.id); setShift(false); }}
                  className="vk-tab flex-1 flex items-center justify-center text-xs font-semibold transition-all duration-200"
                  style={{
                    background: layout === tab.id ? theme.activeTab : 'transparent',
                    color: layout === tab.id ? theme.activeTabText : theme.inactiveTabText,
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Resize Handle ── */}
          <div className="vk-resize absolute bottom-0 right-0 cursor-se-resize flex items-center justify-center"
            style={{ width: 36, height: 36 }}
            onPointerDown={(e) => onResizePointerDown(e, 'se')}>
            <GripVertical className="w-4 h-4 rotate-[-45deg]" style={{ color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
