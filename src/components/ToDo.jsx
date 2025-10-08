"use client";
import React, { useEffect, useRef, useState } from "react";
import { useGetUsersQuery } from "../store/api";

function DragBoard() {
  const KEY = "kanban_simple_v1";
  const { data: users, isLoading } = useGetUsersQuery();

  const [board, setBoard] = useState({ todo: [], inprogress: [], done: [] });
  const dragging = useRef({ col: null, index: null });
  const [hoverCol, setHoverCol] = useState(null);
  function isArr(a) {
    return a && a.constructor === [].constructor;
  }

  useEffect(() => {
    if (!users || typeof users.length !== "number") return;
    const byId = {};
    for (let i = 0; i < users.length; i++) {
      const u = users[i];
      byId[(u && u.id) + ""] = u;
    }
    let saved = null;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) saved = JSON.parse(raw);
    } catch {}
    function toList(arr) {
      if (!isArr(arr)) return [];
      const res = [];
      for (let i = 0; i < arr.length; i++) {
        const item = byId[arr[i] + ""];
        if (item != null) res.push(item);
      }
      return res;
    }
    if (saved && typeof saved === "object") {
      const todo = toList(saved.todo);
      const inprogress = toList(saved.inprogress);
      const done = toList(saved.done);
      const onBoard = {};
      for (let i = 0; i < todo.length; i++) onBoard[todo[i].id + ""] = 1;
      for (let i = 0; i < inprogress.length; i++)
        onBoard[inprogress[i].id + ""] = 1;
      for (let i = 0; i < done.length; i++) onBoard[done[i].id + ""] = 1;
      const rest = [];
      for (let i = 0; i < users.length; i++) {
        const idStr = users[i].id + "";
        if (!onBoard[idStr]) rest.push(users[i]);
      }
      setBoard({ todo: todo.concat(rest), inprogress, done });
    } else {
      setBoard({
        todo: users.slice ? users.slice() : users,
        inprogress: [],
        done: [],
      });
    }
  }, [users]);
  useEffect(() => {
    const data = {
      todo: board.todo.map((u) => u.id),
      inprogress: board.inprogress.map((u) => u.id),
      done: board.done.map((u) => u.id),
    };
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {}
  }, [board]);

  function resetBoard() {
    if (users && typeof users.length === "number") {
      setBoard({
        todo: users.slice ? users.slice() : users,
        inprogress: [],
        done: [],
      });
    } else {
      setBoard({ todo: [], inprogress: [], done: [] });
    }
    localStorage.removeItem(KEY);
  }

  // --- DnD ---
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
  function onDropOnCard(destCol, destIndex) {
    return (e) => {
      e.preventDefault();
      const from = dragging.current;
      if (!from || from.col == null) return;

      setBoard((prev) => {
        const next = {
          todo: prev.todo.slice(),
          inprogress: prev.inprogress.slice(),
          done: prev.done.slice(),
        };

        const srcList = next[from.col];
        const movedArr = srcList.splice(from.index, 1);
        const item = movedArr[0];

        const dstList = destCol === from.col ? srcList : next[destCol];
        const insertIndex =
          destCol === from.col && from.index < destIndex
            ? destIndex - 1
            : destIndex;

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
          todo: prev.todo.slice(),
          inprogress: prev.inprogress.slice(),
          done: prev.done.slice(),
        };

        const srcList = next[from.col];
        const movedArr = srcList.splice(from.index, 1);
        const item = movedArr[0];

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

  if (isLoading) return <div className="p-4">Loading...</div>;

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
          className={
            "min-h-40 rounded-xl border border-dashed p-2 transition-colors " +
            (hoverCol === colKey
              ? "border-indigo-400 bg-indigo-50"
              : "border-slate-200 bg-white")
          }
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
                    Последнее действие:{" "}
                    <b className="text-slate-700">сегодня</b>
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
                    Активен
                  </span>
                </div>
              </div>
            </div>
          ))}
          {(!items || items.length === 0) && (
            <div className="text-xs text-slate-400">
              Перетащите карточки сюда
            </div>
          )}
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
          <Column
            title="In Progress"
            colKey="inprogress"
            items={board.inprogress}
          />
          <Column title="Done" colKey="done" items={board.done} />
        </div>
      </div>
    </div>
  );
}

export default React.memo(DragBoard);
