"use client";
import React, { useEffect, useRef, useState } from "react";

const LS_KEY = "kanban_board_v1";

const seed = {
  todo: [
    { id: "1", text: "Сделать шапку" },
    { id: "2", text: "Подключить API" },
    { id: "3", text: "Сверстать карточку" },
  ],
  inprogress: [{ id: "4", text: "Логика фильтра" }],
  done: [],
};

export default function KanbanBoard() {
  const [columns, setColumns] = useState(seed);
  const dragRef = useRef({ colId: null, index: null });
  const [overCol, setOverCol] = useState(null); // для подсветки зоны

  // init from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      setColumns(raw ? JSON.parse(raw) : seed);
    } catch {
      setColumns(seed);
    }
  }, []);

  // persist
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(columns));
  }, [columns]);

  const reset = () => {
    setColumns(seed);
    localStorage.removeItem(LS_KEY);
  };

  // DnD helpers
  const onDragStart = (colId, index) => () => {
    dragRef.current = { colId, index };
  };
  const onDragOver = (colId) => (e) => {
    e.preventDefault();
    setOverCol(colId);
  };
  const clearOver = () => setOverCol(null);

  // drop на конкретную карточку (вставить перед ней)
  const onDropCard = (destColId, destIndex) => (e) => {
    e.preventDefault();
    const { colId: srcColId, index: srcIndex } = dragRef.current;
    if (srcColId == null) return;

    if (srcColId === destColId && srcIndex === destIndex) return;

    setColumns((prev) => {
      const next = { ...prev };
      const srcList = [...next[srcColId]];
      const [moved] = srcList.splice(srcIndex, 1);
      const dstList = srcColId === destColId ? srcList : [...next[destColId]];
      // при переносе внутри одной колонки индекс сдвигается, если тащим вниз
      const insertAt =
        srcColId === destColId && srcIndex < destIndex ? destIndex - 1 : destIndex;
      dstList.splice(insertAt, 0, moved);

      next[srcColId] =
        srcColId === destColId ? dstList : srcList; // если те же — уже собрали в dstList
      next[destColId] = dstList;
      return next;
    });

    dragRef.current = { colId: null, index: null };
    clearOver();
  };

  // drop в пустое место колонки (в конец)
  const onDropColumnEnd = (destColId) => (e) => {
    e.preventDefault();
    const { colId: srcColId, index: srcIndex } = dragRef.current;
    if (srcColId == null) return;

    setColumns((prev) => {
      const next = { ...prev };
      const srcList = [...next[srcColId]];
      const [moved] = srcList.splice(srcIndex, 1);
      const dstList = srcColId === destColId ? srcList : [...next[destColId]];
      dstList.push(moved);
      next[srcColId] = srcList;
      next[destColId] = dstList;
      return next;
    });

    dragRef.current = { colId: null, index: null };
    clearOver();
  };

  const Column = ({ id, title, items }) => (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">
          {title}
          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
            {items.length}
          </span>
        </h3>
      </div>

      <div
        className={`min-h-[140px] rounded-3xl border border-dashed p-3 transition
        ${overCol === id ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-white"}`}
        onDragOver={onDragOver(id)}
        onDrop={onDropColumnEnd(id)}
        onDragLeave={clearOver}
      >
        {items.map((item, index) => (
          <div
            key={item.id}
            className="mb-3 last:mb-0 rounded-2xl border border-slate-200 bg-white p-3 text-sm shadow-sm cursor-move"
            draggable
            onDragStart={onDragStart(id, index)}
            onDragOver={onDragOver(id)}
            onDrop={onDropCard(id, index)}
          >
            {item.text}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Drag & Drop Канбан</h1>
        <div className="flex gap-2">
          <button
            onClick={reset}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
          >
            Сбросить
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Column id="todo" title="To Do" items={columns.todo} />
        <Column id="inprogress" title="In Progress" items={columns.inprogress} />
        <Column id="done" title="Done" items={columns.done} />
      </div>

      <p className="mt-6 text-xs text-slate-500">
        Подсказка: перетаскивай карточки между колонками и внутри колонок. Порядок сохраняется в
        <code> localStorage</code>.
      </p>
    </main>
  );
}
