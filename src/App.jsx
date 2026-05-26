import { useState, useEffect } from "react";
import { supabase } from "./supabase"; // Đảm bảo đường dẫn này đúng với file cấu hình của bạn

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("todo"); // 'todo' hoặc 'done'

  // Hàm bổ trợ sắp xếp tác vụ theo thời gian (Mới nhất lên đầu)
  const sortByDate = (taskList) => {
    return [...taskList].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  };

  // 1. Lấy toàn bộ danh sách Task từ Supabase khi tải trang
  useEffect(() => {
    const fetchTasks = async () => {
      const { data, error: fetchErr } = await supabase
        .from("tasks")
        .select("*");
      
      if (!fetchErr) {
        // Ánh xạ lại tên cột từ DB (created_at) sang state (createdAt) nếu cần
        const mappedTasks = data.map(item => ({
          id: item.id,
          title: item.title,
          status: item.status,
          createdAt: item.created_at // Đồng bộ với cột tự động của Supabase
        }));
        setTasks(sortByDate(mappedTasks));
      } else {
        console.error("Lỗi lấy dữ liệu:", fetchErr);
      }
    };
    fetchTasks();
  }, []);

  // 2. Hàm xử lý Thêm mới tác vụ (Đã sửa lỗi 400)
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Tạo object mẫu để lưu nhanh xuống State local giúp giao diện mượt mà
    const newTask = {
      id: Date.now().toString(),
      title: input.trim(),
      status: "todo",
      createdAt: new Date().toISOString(),
    };

    try {
      // Thực hiện Destructuring: Loại bỏ hoàn toàn id và createdAt gây lệch cấu trúc với DB
      // Supabase sẽ tự động sinh id uuid và created_at chuẩn timestamp cho bạn
      const { createdAt, id, ...taskDataToSend } = newTask;

      const { error: err } = await supabase
        .from("tasks")
        .insert([taskDataToSend]); // Chỉ gửi các trường hợp lệ (title, status)

      if (!err) {
        setTasks(sortByDate([...tasks, newTask]));
        setInput("");
        setError(null);
      } else {
        console.error("Supabase Error Details:", err);
        setError("Không thể lưu dữ liệu lên Supabase Cloud.");
      }
    } catch (catchError) {
      console.error("System Error:", catchError);
      setError("Đã xảy ra lỗi hệ thống khi kết nối.");
    }
  };

  // 3. Hàm xử lý Cập nhật trạng thái Task (Đổi từ To-do sang Done và ngược lại)
  const handleToggleStatus = async (task) => {
    const nextStatus = task.status === "todo" ? "done" : "todo";

    const { error: updateErr } = await supabase
      .from("tasks")
      .update({ status: nextStatus })
      .eq("title", task.title); // Hoặc .eq("id", task.id) nếu bạn dùng cột ID khớp nhau

    if (!updateErr) {
      const updatedTasks = tasks.map((t) =>
        t.title === task.title ? { ...t, status: nextStatus } : t
      );
      setTasks(sortByDate(updatedTasks));
    } else {
      console.error("Lỗi cập nhật trạng thái:", updateErr);
    }
  };

  // Lọc danh sách hiển thị theo Tab được chọn
  const filteredTasks = tasks.filter((t) => t.status === filter);
  const todoCount = tasks.filter((t) => t.status === "todo").length;
  const doneCount = tasks.filter((t) => t.status === "done").length;

  return (
    <div className="min-h-screen bg-[#121212] text-white font-sans antialiased p-8 selection:bg-yellow-500 selection:text-black">
      <div className="max-w-3xl mx-auto mt-12">
        {/* Header */}
        <header className="flex justify-between items-center mb-12 border-b border-zinc-800 pb-6">
          <div>
            <p className="text-xs tracking-widest text-zinc-500 uppercase font-mono mb-1">Work Dashboard</p>
            <h1 className="text-4xl font-bold tracking-tight">Nghĩa / AE</h1>
          </div>
          <div className="flex gap-2 bg-zinc-900 p-1 rounded-lg border border-zinc-850">
            <button className="px-4 py-2 rounded-md text-sm font-medium transition bg-zinc-800 text-white shadow-sm flex items-center gap-2">
              📋 Tasks
            </button>
            <button className="px-4 py-2 rounded-md text-sm font-medium transition text-zinc-400 hover:text-white flex items-center gap-2 opacity-50 cursor-not-allowed">
              📁 Projects
            </button>
          </div>
        </header>

        {/* Tab Filters */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setFilter("todo")}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition border ${
              filter === "todo"
                ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-500"
                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            {todoCount} To-Dos
          </button>
          <button
            onClick={() => setFilter("done")}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition border ${
              filter === "done"
                ? "bg-zinc-800 border-zinc-700 text-zinc-300"
                : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white"
            }`}
          >
            {doneCount} Done
          </button>
        </div>

        {/* Form Add Task */}
        <form onSubmit={handleAddTask} className="relative flex items-center bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden focus-within:border-zinc-700 transition mb-4 shadow-2xl">
          <span className="pl-5 text-zinc-600 font-mono text-xl">+</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Nhập task mới (Ví dụ: 26/5 - Hoàn thiện Proposal)..."
            className="w-full bg-transparent py-4 pl-3 pr-24 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none"
          />
          <button
            type="submit"
            className="absolute right-2 top-2 bottom-2 bg-yellow-500 hover:bg-yellow-400 text-black px-5 rounded-lg text-xs font-bold tracking-wider uppercase transition active:scale-95"
          >
            ADD
          </button>
        </form>

        {/* Thông báo lỗi nếu có */}
        {error && (
          <p className="text-center text-sm font-mono text-red-500 my-4 tracking-wide animate-pulse">
            {error}
          </p>
        )}

        {/* Danh sách Tasks */}
        <div className="space-y-2 mt-6">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12 bg-zinc-900/40 border border-dashed border-zinc-850 rounded-xl">
              <p className="text-zinc-600 text-sm font-mono">Không tìm thấy tác vụ nào trong danh sách.</p>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => handleToggleStatus(task)}
                className="group flex items-center justify-between p-4 bg-zinc-900/80 border border-zinc-850 rounded-xl hover:bg-zinc-850 hover:border-zinc-700 transition cursor-pointer shadow-sm select-none"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                    task.status === "done" 
                      ? "bg-zinc-700 border-zinc-600 text-zinc-400" 
                      : "border-zinc-700 group-hover:border-zinc-500"
                  }`}>
                    {task.status === "done" && "✓"}
                  </div>
                  <span className={`text-sm tracking-wide transition ${
                    task.status === "done" ? "line-through text-zinc-500" : "text-zinc-200"
                  }`}>
                    {task.title}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-zinc-600 group-hover:text-zinc-400 transition">
                  {new Date(task.createdAt).toLocaleDateString("vi-VN", {
                    month: "numeric",
                    day: "numeric",
                  })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}