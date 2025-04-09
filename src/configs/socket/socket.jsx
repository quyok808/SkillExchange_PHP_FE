import io from "socket.io-client";
import Toast from "../../utils/Toast";

// Initialize socket connection
const socket = io("http://localhost:5009", {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

// Connection event handlers
socket.on("connect", () => {
  console.log("Connected to Socket.IO server");
});

socket.on("disconnect", (reason) => {
  console.log("Disconnected from Socket.IO server:", reason);
});

socket.on("connect_error", (error) => {
  console.error("Connection error:", error);
});

// Lắng nghe thông báo đặt lịch
socket.on("receive-notify-book-appointment", (data) => {
  Toast.fire({
    icon: "info",
    title: data.message || "Bạn có 1 cuộc hẹn mới!",
  });
});

// Lắng nghe tin nhắn mới từ phòng chat
socket.on("newMessage", (messageData) => {
  console.log("New message received:", messageData);
  // Ví dụ: Hiển thị thông báo hoặc cập nhật UI
  Toast.fire({
    icon: "success",
    title: `New message from ${messageData.userId}: ${messageData.message}`,
  });
});

// Lắng nghe lỗi gửi tin nhắn
socket.on("messageError", (data) => {
  console.error("Message error:", data.error);
  Toast.fire({
    icon: "error",
    title: data.error,
  });
});

// Lắng nghe cập nhật trạng thái online/offline
socket.on("onlineStatusUpdate", ({ userId, status }) => {
  console.log(`User ${userId} is now ${status}`);
  // Cập nhật UI nếu cần
});

// Lắng nghe phản hồi kiểm tra trạng thái
socket.on("userStatusResponse", ({ userId, status }) => {
  console.log(`Status of user ${userId}: ${status}`);
  // Xử lý kết quả trong UI nếu cần
});

// Function to join a chat room
export const joinChatRoom = (chatRoomId) => {
  socket.emit("joinRoom", chatRoomId);
};

// Function to set user online status
export const setUserOnline = (userId) => {
  socket.emit("userOnline", userId);
};

// Function to check user status
export const checkUserStatus = (userId) => {
  socket.emit("checkUserStatus", userId);
};

// Function to send a message
export const sendMessage = (chatRoomId, userId, message) => {
  socket.emit("sendMessage", { chatRoomId, userId, message });
};

// Function to cleanup socket listeners
export const cleanupSocket = () => {
  socket.off("newMessage");
  socket.off("messageError");
  socket.off("onlineStatusUpdate");
  socket.off("userStatusResponse");
  socket.off("receive-notify-book-appointment");
};

export default socket;