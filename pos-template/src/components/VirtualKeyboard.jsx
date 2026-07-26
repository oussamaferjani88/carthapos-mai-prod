import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Keyboard, X, GripVertical, Delete, CornerDownLeft, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

// ── Phone-style keyboard layouts ────────────────────────────────────────
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
    ['🍔', '☕', '🍕', '🥤', '🍰', '🍰', '🎂', '🍺', '🍷', '🥂'],
  ],
};

const LAYOUT_TABS = [
  { id: 'abc', label: 'ABC' },
  { id: 'numbers', label: '123' },
  { id: 'symbols', label: '#+=' },
  { id: 'emojis', label: '😊' },
];

const MIN_W = 340;
const MIN_H = 200;
const MAX_W = 1200;
const MAX_H = 800;
const DEFAULT_W = 520;
const DEFAULT_H = 280;
const FAB_SIZE = 56;
const FAB_MARGIN = 16;

function getDefaultFabPos() {
  return {
    x: window.innerWidth - FAB_SIZE - FAB_MARGIN,
    y: window.innerHeight - FAB_SIZE - FAB_MARGIN,
  };
}

export default function VirtualKeyboard({ onEnter, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [shift, setShift] = useState(false);
  const [layout, setLayout] = useState('abc');

  const [kbPos, setKbPos] = useState({ x: 0, y: 0 });
  const [kbSize, setKbSize] = useState({ w: DEFAULT_W, h: DEFAULT_H });

  const [dragging, setDragging] = useState(null);
  const [resizing, setResizing] = useState(null);
  const dragRef = useRef({ startX: 0, startY: 0, startPosX: 0, startPosY: 0 });
  const panelRef = useRef(null);
  const lastFocusedInput = useRef(null);

  // ── Track last focused input ──────────────────────────────────────────
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

  // ── Resize / Drag effect ────────────────────────────────────────────
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

  // ── Open / Close ──────────────────────────────────────────────────────
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

  // ── Write to focused input ────────────────────────────────────────────
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

  // ── Tab navigation ────────────────────────────────────────────────────
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

  // ── Key handler ───────────────────────────────────────────────────────
  const handleKey = useCallback((key) => {
    if (disabled) return;
    if (key === 'SHIFT') { setShift(s => !s); return; }
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

    const char = shift ? key.toUpperCase() : (layout === 'abc' || layout === 'abcUpper') ? key.toLowerCase() : key;
    writeToActiveElement(char, false, false);
    if (shift && (layout === 'abc' || layout === 'abcUpper')) setShift(false);
  }, [disabled, shift, layout, writeToActiveElement, focusNextInput]);

  // ── FAB Drag ──────────────────────────────────────────────────────────
  const onFabPointerDown = (e) => {
    if (e.target.closest('.vk-toggle')) return;
    e.preventDefault();
  };

  // ── Keyboard Panel Drag ───────────────────────────────────────────────
  const onKbHeaderPointerDown = (e) => {
    if (e.target.closest('.vk-toggle') || e.target.closest('.vk-key') || e.target.closest('.vk-tab')) return;
    e.preventDefault();
    setDragging('kb');
    dragRef.current = {
      startX: e.clientX, startY: e.clientY,
      startPosX: kbPos.x, startPosY: kbPos.y,
    };
  };

  // ── Resize ────────────────────────────────────────────────────────────
  const onResizePointerDown = (e, edge) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing({
      edge, startX: e.clientX, startY: e.clientY,
      startPos: { ...kbPos }, startSize: { ...kbSize },
    });
  };

  if (disabled) return null;

  // ── Current layout ────────────────────────────────────────────────────
  const currentLayout = layout === 'abc'
    ? (shift ? LAYOUTS.abcUpper : LAYOUTS.abc)
    : LAYOUTS[layout] || LAYOUTS.abc;

  const panelH = kbSize.h;
  const tabBarH = 36;
  const headerH = 34;
  const enterRowH = 38;
  const keysAreaH = panelH - tabBarH - headerH - enterRowH - 16;
  const rows = currentLayout.length;
  const keyH = Math.max(28, Math.min(48, keysAreaH / Math.max(rows, 1)));
  const paddingX = 8;
  const paddingY = 8;
  const keyGap = 3;

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
          className={`vk-toggle rounded-full shadow-lg flex items-center justify-center transition-all duration-300 active:scale-95 hover:shadow-xl ${
            isOpen ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
          style={{ width: FAB_SIZE, height: FAB_SIZE, touchAction: 'none' }}
        >
          {isOpen ? <X className="w-5 h-5 transition-transform duration-200 rotate-0" /> : <Keyboard className="w-5 h-5 transition-transform duration-200" />}
        </button>
      </div>

      {/* ===== Keyboard Panel ===== */}
      {isOpen && (
        <div
          ref={panelRef}
          className="fixed z-[70] select-none animate-in fade-in slide-in-from-bottom-2 duration-200"
          style={{
            left: kbPos.x, top: kbPos.y,
            width: kbSize.w, height: kbSize.h,
            touchAction: 'none',
            transition: resizing ? 'none' : 'width 0.15s ease, height 0.15s ease',
          }}
          onPointerDown={(e) => {
            if (e.target.closest('.vk-key') || e.target.closest('.vk-toggle') || e.target.closest('.vk-resize') || e.target.closest('.vk-tab')) return;
            e.preventDefault();
          }}
        >
          <div className="bg-gray-100 rounded-2xl shadow-2xl border border-gray-300 overflow-hidden flex flex-col"
            style={{ width: '100%', height: '100%' }}>

            {/* ── Header ── */}
            <div
              className="bg-gray-800 text-white px-3 flex items-center justify-between cursor-grab active:cursor-grabbing shrink-0"
              style={{ height: headerH }}
              onPointerDown={onKbHeaderPointerDown}
            >
              <div className="flex items-center gap-2">
                <Keyboard className="w-3.5 h-3.5" />
                <span className="font-semibold text-xs">Clavier</span>
                <GripVertical className="w-3 h-3 opacity-30" />
              </div>
              <div className="flex items-center gap-1">
                {/* Arrow keys */}
                <button onClick={() => focusNextInput('prev')} className="vk-key w-5 h-5 bg-white/10 hover:bg-white/20 rounded flex items-center justify-center text-[9px]" style={{ touchAction: 'none' }}>◀</button>
                <button onClick={() => focusNextInput('next')} className="vk-key w-5 h-5 bg-white/10 hover:bg-white/20 rounded flex items-center justify-center text-[9px]" style={{ touchAction: 'none' }}>▶</button>
                <button onClick={closeKeyboard} className="vk-toggle w-5 h-5 bg-white/15 hover:bg-white/25 rounded flex items-center justify-center ml-1">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* ── Keys Area ── */}
            <div className="flex-1 flex flex-col justify-center gap-[3px] px-1 py-1 overflow-hidden">
              {currentLayout.map((row, ri) => (
                <div key={ri} className="flex justify-center" style={{ gap: keyGap }}>
                  {row.map((key) => {
                    const isWide = key === 'ESPACE';
                    const isShift = key === 'SHIFT';
                    const isBackspace = key === '⌫';
                    const isEmoji = layout === 'emojis';

                    let bg = 'bg-white hover:bg-gray-50 text-gray-800 shadow-sm';
                    let textColor = 'text-gray-800';
                    if (isShift && shift) { bg = 'bg-blue-500 text-white shadow-md'; textColor = 'text-white'; }
                    else if (isShift) { bg = 'bg-gray-200 hover:bg-gray-300 text-gray-600'; textColor = 'text-gray-600'; }
                    if (isBackspace) { bg = 'bg-red-50 hover:bg-red-100 text-red-500'; textColor = 'text-red-500'; }

                    const w = isWide
                      ? Math.max(80, kbSize.w - paddingX * 2 - keyGap * 4)
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
                        className={`vk-key ${bg} rounded-lg font-medium transition-all active:scale-95 flex items-center justify-center select-none`}
                        style={{
                          width: isWide ? Math.min(w, kbSize.w * 0.4) : w,
                          height: isEmoji ? Math.min(keyH, 42) : keyH,
                          flexShrink: 0,
                          fontSize: isEmoji ? '18px' : isShift || isBackspace ? '11px' : Math.max(11, Math.min(16, keyH * 0.35)),
                          touchAction: 'none',
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
            <div className="flex items-center gap-[3px] px-1 pb-1 shrink-0" style={{ height: enterRowH }}>
              <button
                type="button"
                onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); focusNextInput('prev'); }}
                className="vk-key bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0"
                style={{ width: 36, height: enterRowH - 4, touchAction: 'none' }}
              >
                TAB
              </button>
              <button
                type="button"
                onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); writeToActiveElement(null, false, true); }}
                className="vk-key bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg flex items-center justify-center text-[11px] font-semibold shrink-0"
                style={{ width: 64, height: enterRowH - 4, touchAction: 'none' }}
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
                className="vk-key bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center justify-center text-[12px] font-semibold flex-1"
                style={{ height: enterRowH - 4, touchAction: 'none' }}
              >
                <CornerDownLeft className="w-3.5 h-3.5 mr-1" /> Entrer
              </button>
            </div>

            {/* ── Layout Tabs ── */}
            <div className="flex border-t border-gray-200 shrink-0" style={{ height: tabBarH }}>
              {LAYOUT_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => { setLayout(tab.id); setShift(false); }}
                  className={`vk-tab flex-1 flex items-center justify-center text-xs font-semibold transition-colors ${
                    layout === tab.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-500'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Resize Handle (SE corner only — diagonal resize) ── */}
          <div className="vk-resize absolute bottom-0 right-0 cursor-se-resize flex items-center justify-center"
            style={{ width: 36, height: 36 }}
            onPointerDown={(e) => onResizePointerDown(e, 'se')}>
            <GripVertical className="w-4 h-4 text-gray-300 rotate-[-45deg]" />
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
