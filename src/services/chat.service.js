
// export default chatService;
import axios from "axios";
import authHeader from "./auth-header";

const API_URL = "http://localhost:5008/api/"; // Đảm bảo port khớp với Laravel

const chatService = {
  // Lấy danh sách tin nhắn theo chatRoomId
  getMessages: async (chatRoomId, page = 1, limit = 50) => {
    try {
      const response = await axios.get(`${API_URL}messages/${chatRoomId}`, {
        headers: authHeader(),
        params: { page, limit }, // Hỗ trợ phân trang nếu cần
      });

      // Kiểm tra cấu trúc response
      if (response.data.status === "success") {
        return {
          status: "success",
          data: response.data.data.data, // Trả về mảng tin nhắn từ pagination
          pagination: {
            currentPage: response.data.data.current_page,
            totalPages: response.data.data.last_page,
            totalItems: response.data.data.total,
          },
        };
      } else {
        throw new Error(response.data.message || "Lỗi không xác định từ server");
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Lỗi mạng";
      console.error("Lỗi khi lấy tin nhắn:", errorMessage);
      throw new Error(errorMessage);
    }
  },

  // Gửi tin nhắn (hỗ trợ text, image, file qua FormData)
  sendMessage: async (formData) => {
    try {
      const response = await axios.post(`${API_URL}messages/send`, formData, {
        headers: {
          ...authHeader(),
          "Content-Type": "multipart/form-data", // Gửi FormData
        },
      });

      // Kiểm tra cấu trúc response
      if (response.data.status === "success") {
        return {
          status: "success",
          data: response.data.data, // Trả về thông tin tin nhắn vừa gửi
        };
      } else {
        throw new Error(response.data.message || "Lỗi không xác định từ server");
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || error.message || "Lỗi mạng";
      console.error("Lỗi khi gửi tin nhắn:", errorMessage);
      throw new Error(errorMessage);
    }
  },

  // Hàm base để xử lý request (tái sử dụng nếu cần mở rộng)
  _request: async (method, url, data = null, customHeaders = {}) => {
    try {
      const config = {
        method,
        url: `${API_URL}${url}`,
        headers: {
          ...authHeader(),
          ...customHeaders,
        },
        data,
      };
      const response = await axios(config);

      if (response.data.status === "success") {
        return response.data; // Trả về dữ liệu từ server
      } else {
        throw new Error(response.data.message || "Lỗi không xác định từ server");
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || error.message || "Lỗi mạng";
      console.error(`Lỗi request ${method} ${url}:`, errorMessage);
      throw new Error(errorMessage);
    }
  },
};

export default chatService;