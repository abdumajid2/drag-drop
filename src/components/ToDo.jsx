"use client";
import React, { useEffect, useRef, useState } from "react";
import { useGetUsersQuery } from "../store/api";

export default function DashboardKanbanSimple() {
  const STORAGE_KEY = "kanban_simple_v1";
  const { data: users, isLoading } = useGetUsersQuery();

  const [board, setBoard] = useState({
    todo: [],
    inprogress: [],
    done: [],
  });

  const dragging = useRef({ col: null, index: null });
  const [hoverCol, setHoverCol] = useState(null);

  // читаем из localStorage после прихода users
  useEffect(() => {
    if (!Array.isArray(users)) return;

    const byId = {};
    users.forEach((u) => (byId[String(u.id)] = u));

    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch {}

    if (saved && typeof saved === "object") {
      const todo = Array.isArray(saved.todo) ? saved.todo.map((id) => byId[String(id)]).filter(Boolean) : [];
      const inprogress = Array.isArray(saved.inprogress) ? saved.inprogress.map((id) => byId[String(id)]).filter(Boolean) : [];
      const done = Array.isArray(saved.done) ? saved.done.map((id) => byId[String(id)]).filter(Boolean) : [];

      const onBoard = new Set([...todo, ...inprogress, ...done].map((u) => String(u.id)));
      const rest = users.filter((u) => !onBoard.has(String(u.id)));

      setBoard({ todo: [...todo, ...rest], inprogress, done });
    } else {
      setBoard({ todo: users, inprogress: [], done: [] });
    }
  }, [users]);

  // сохраняем только id
  useEffect(() => {
    const data = {
      todo: board.todo.map((u) => u.id),
      inprogress: board.inprogress.map((u) => u.id),
      done: board.done.map((u) => u.id),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }, [board]);

  function resetBoard() {
    if (Array.isArray(users)) {
      setBoard({ todo: users, inprogress: [], done: [] });
    } else {
      setBoard({ todo: [], inprogress: [], done: [] });
    }
    localStorage.removeItem(STORAGE_KEY);
  }

  // DnD
  function onDragStart(col, index) {
    return () => {
      dragging.current = { col, index };
    };
  }

  function onDragOver(col) {
    return (e) => {
      e.preventDefault();
      setHoverCol(col);
    };
  }

  function clearHover() {
    setHoverCol(null);
  }

  // бросили на карточку — вставить перед ней
  function onDropOnCard(destCol, destIndex) {
    return (e) => {
      e.preventDefault();
      const from = dragging.current;
      if (!from || from.col == null) return;

      setBoard((prev) => {
        const next = {
          todo: [...prev.todo],
          inprogress: [...prev.inprogress],
          done: [...prev.done],
        };

        const srcList = next[from.col];
        const [item] = srcList.splice(from.index, 1);

        const dstList = destCol === from.col ? srcList : next[destCol];
        const insertIndex =
          destCol === from.col && from.index < destIndex ? destIndex - 1 : destIndex;

        dstList.splice(insertIndex, 0, item);

        next[from.col] = srcList;
        next[destCol] = dstList;
        return next;
      });

      dragging.current = { col: null, index: null };
      clearHover();
    };
  }

  function onDropAtEnd(destCol) {
    return (e) => {
      e.preventDefault();
      const from = dragging.current;
      if (!from || from.col == null) return;

      setBoard((prev) => {
        const next = {
          todo: [...prev.todo],
          inprogress: [...prev.inprogress],
          done: [...prev.done],
        };

        const srcList = next[from.col];
        const [item] = srcList.splice(from.index, 1);

        const dstList = destCol === from.col ? srcList : next[destCol];
        dstList.push(item);

        next[from.col] = srcList;
        next[destCol] = dstList;
        return next;
      });

      dragging.current = { col: null, index: null };
      clearHover();
    };
  }

  if (isLoading) {
    return <div className="p-4">Loading...</div>;
  }

  function Column({ title, colKey, items }) {
    return (
      <div className="flex flex-col gap-2">
        <div className="text-sm font-semibold">
          {title}{" "}
          <span className="font-normal text-slate-500">({items.length})</span>
        </div>

        <div
          onDragOver={onDragOver(colKey)}
          onDrop={onDropAtEnd(colKey)}
          onDragLeave={clearHover}
          className={[
            "min-h-40 rounded-xl border border-dashed p-2 transition-colors",
            hoverCol == colKey ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-white",
          ]}
        >
          {items.map((u, i) => (
            <div key={u.id} className="mb-2 last:mb-0">
              <div
                draggable
                onDragStart={onDragStart(colKey, i)}
                onDragOver={onDragOver(colKey)}
                onDrop={onDropOnCard(colKey, i)}
                className="cursor-move rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:shadow"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={u.avatar}
                    alt=""
                    className="h-11 w-11 rounded-lg object-cover ring-1 ring-slate-200"
                  />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">
                      {u.userName}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {u.userJob || "Сотрудник"}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Последнее действие: <b className="text-slate-700">сегодня</b>
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
                    Активен
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="font-bold">Admin Panel — Канбан</div>
          <button
            onClick={resetBoard}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            Сбросить
          </button>
        </div>
        <div className="mb-3 text-xs text-slate-600">
          Дата: <b>{new Date().toLocaleDateString()}</b>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Column title="To Do" colKey="todo" items={board.todo} />
          <Column title="In Progress" colKey="inprogress" items={board.inprogress} />
          <Column title="Done" colKey="done" items={board.done} />
        </div>
      </div>
    </div>
  );
}
